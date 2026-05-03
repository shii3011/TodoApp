import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { TODO_INCLUDE, formatTodo } from '../../lib/todoFormat.js';
import type { TodosRepository, CreateTodoData, ReplaceTodoData, PatchTodoData } from './types.js';

const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 10_000,
};

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

export const todosPrismaRepository: TodosRepository = {
  async listByUser(userId) {
    const todos = await prisma.todo.findMany({
      where: { userId, parentId: null },
      include: TODO_INCLUDE,
      orderBy: [
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { priority: 'desc' },
      ],
    });
    return todos.map(formatTodo);
  },

  async findById(id, userId) {
    const todo = await prisma.todo.findFirst({ where: { id, userId }, include: TODO_INCLUDE });
    return todo ? formatTodo(todo) : null;
  },

  async create(userId, data: CreateTodoData) {
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
  },

  async replace(id, userId, data: ReplaceTodoData) {
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
  },

  async patch(id, userId, data: PatchTodoData) {
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
  },

  async delete(id, userId) {
    await prisma.$transaction(async (tx) => {
      await lockTodoOrThrow(tx, id, userId);
      await tx.todo.delete({ where: { id } });
    }, TX_OPTIONS);
  },
};
