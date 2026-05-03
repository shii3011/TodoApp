import { Prisma } from '@prisma/client';

export const TODO_INCLUDE = {
  tags: { include: { tag: true } },
  subtasks: {
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.TodoInclude;

type RawTodo = Prisma.TodoGetPayload<{ include: typeof TODO_INCLUDE }>;

export function formatTodo(raw: RawTodo) {
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

export type FormattedTodo = ReturnType<typeof formatTodo>;
