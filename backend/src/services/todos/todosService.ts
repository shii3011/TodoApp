import { AppError } from '../../lib/errors.js';
import type { TodosRepository, CreateTodoData, ReplaceTodoData, PatchTodoData } from '../../repositories/todos/types.js';
import type { TagsRepository } from '../../repositories/tags/types.js';
import { todosPrismaRepository } from '../../repositories/todos/todosPrismaRepository.js';
import { tagsPrismaRepository } from '../../repositories/tags/tagsPrismaRepository.js';

export function createTodosService(todosRepo: TodosRepository, tagsRepo: TagsRepository) {
  async function validateTagIds(tagIds: string[], userId: string): Promise<void> {
    if (!tagIds.length) return;
    const count = await tagsRepo.countByIds(tagIds, userId);
    if (count !== tagIds.length) throw new AppError(400, 'Invalid tag IDs');
  }

  return {
    async listTodos(userId: string) {
      return todosRepo.listByUser(userId);
    },

    async getTodo(id: string, userId: string) {
      const todo = await todosRepo.findById(id, userId);
      if (!todo) throw new AppError(404, 'Todo not found');
      return todo;
    },

    async createTodo(userId: string, data: CreateTodoData) {
      if (data.tagIds?.length) await validateTagIds(data.tagIds, userId);
      if (data.parentId) {
        const parent = await todosRepo.findById(data.parentId, userId);
        if (!parent || parent.parentId !== null) throw new AppError(400, 'Invalid parent todo');
      }
      return todosRepo.create(userId, data);
    },

    async replaceTodo(id: string, userId: string, data: ReplaceTodoData) {
      if (data.tagIds?.length) await validateTagIds(data.tagIds, userId);
      return todosRepo.replace(id, userId, data);
    },

    async patchTodo(id: string, userId: string, data: PatchTodoData) {
      if (data.tagIds?.length) await validateTagIds(data.tagIds, userId);
      return todosRepo.patch(id, userId, data);
    },

    async deleteTodo(id: string, userId: string) {
      return todosRepo.delete(id, userId);
    },
  };
}

const service = createTodosService(todosPrismaRepository, tagsPrismaRepository);
export const { listTodos, getTodo, createTodo, replaceTodo, patchTodo, deleteTodo } = service;
