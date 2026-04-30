import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 10_000,
};

const TODO_INCLUDE = {
  tags: { include: { tag: true } },
  subtasks: {
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.TodoInclude;

type RawTodo = Prisma.TodoGetPayload<{ include: typeof TODO_INCLUDE }>;

function formatTodo(raw: RawTodo) {
  return {
    ...raw,
    tags: raw.tags.map(t => t.tag),
    subtasks: raw.subtasks.map(s => ({
      ...s,
      tags: s.tags.map(t => t.tag),
      subtasks: [],
    })),
  };
}

async function lockTodoOrThrow(
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
): Promise<void> {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM todos WHERE id = ${id} AND "userId" = ${userId} FOR UPDATE
  `;
  if (locked.length === 0) throw new AppError(404, 'Todo not found');
}

async function validateTagIds(tagIds: string[], userId: string): Promise<void> {
  if (!tagIds.length) return;
  const count = await prisma.tag.count({ where: { id: { in: tagIds }, userId } });
  if (count !== tagIds.length) throw new AppError(400, 'Invalid tag IDs');
}

export async function listTodos(userId: string) {
  const todos = await prisma.todo.findMany({
    where: { userId, parentId: null },
    include: TODO_INCLUDE,
    orderBy: [
      { dueDate: { sort: 'asc', nulls: 'last' } },
      { priority: 'desc' },
    ],
  });
  return todos.map(formatTodo);
}

export async function getTodo(id: string, userId: string) {
  const todo = await prisma.todo.findFirst({ where: { id, userId }, include: TODO_INCLUDE });
  if (!todo) throw new AppError(404, 'Todo not found');
  return formatTodo(todo);
}

export async function createTodo(
  userId: string,
  data: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string | undefined;
    tagIds?: string[] | undefined;
    parentId?: string | undefined;
  },
) {
  if (data.tagIds?.length) await validateTagIds(data.tagIds, userId);
  if (data.parentId) {
    const parent = await prisma.todo.findFirst({ where: { id: data.parentId, userId } });
    if (!parent || parent.parentId !== null) throw new AppError(400, 'Invalid parent todo');
  }
  const todo = await prisma.todo.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      parentId: data.parentId ?? null,
      ...(data.tagIds?.length ? { tags: { create: data.tagIds.map(tagId => ({ tagId })) } } : {}),
    },
    include: TODO_INCLUDE,
  });
  return formatTodo(todo);
}

export async function replaceTodo(
  id: string,
  userId: string,
  data: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    dueDate?: string | null | undefined;
    tagIds?: string[] | undefined;
  },
) {
  if (data.tagIds?.length) await validateTagIds(data.tagIds, userId);
  const todo = await prisma.$transaction(async (tx) => {
    await lockTodoOrThrow(tx, id, userId);
    await tx.todoTag.deleteMany({ where: { todoId: id } });
    if (data.tagIds?.length) {
      await tx.todoTag.createMany({ data: data.tagIds.map(tagId => ({ todoId: id, tagId })) });
    }
    return tx.todo.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        completed: data.completed,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: TODO_INCLUDE,
    });
  }, TX_OPTIONS);
  return formatTodo(todo);
}

export async function patchTodo(
  id: string,
  userId: string,
  data: {
    title?: string | undefined;
    description?: string | undefined;
    priority?: 'low' | 'medium' | 'high' | undefined;
    completed?: boolean | undefined;
    dueDate?: string | null | undefined;
    tagIds?: string[] | undefined;
  },
) {
  if (data.tagIds?.length) await validateTagIds(data.tagIds, userId);
  const todo = await prisma.$transaction(async (tx) => {
    await lockTodoOrThrow(tx, id, userId);
    if (data.tagIds !== undefined) {
      await tx.todoTag.deleteMany({ where: { todoId: id } });
      if (data.tagIds.length) {
        await tx.todoTag.createMany({ data: data.tagIds.map(tagId => ({ todoId: id, tagId })) });
      }
    }
    return tx.todo.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.completed !== undefined && { completed: data.completed }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      },
      include: TODO_INCLUDE,
    });
  }, TX_OPTIONS);
  return formatTodo(todo);
}

export async function deleteTodo(id: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    await lockTodoOrThrow(tx, id, userId);
    await tx.todo.delete({ where: { id } });
  }, TX_OPTIONS);
}
