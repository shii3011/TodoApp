import type { FormattedTodo } from '../../lib/todoFormat.js';

export interface CreateTodoData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | undefined;
  tagIds?: string[] | undefined;
  parentId?: string | undefined;
}

export interface ReplaceTodoData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  dueDate?: string | null | undefined;
  tagIds?: string[] | undefined;
}

export interface PatchTodoData {
  title?: string | undefined;
  description?: string | undefined;
  priority?: 'low' | 'medium' | 'high' | undefined;
  completed?: boolean | undefined;
  dueDate?: string | null | undefined;
  tagIds?: string[] | undefined;
}

export interface TodosRepository {
  listByUser(userId: string): Promise<FormattedTodo[]>;
  findById(id: string, userId: string): Promise<FormattedTodo | null>;
  create(userId: string, data: CreateTodoData): Promise<FormattedTodo>;
  replace(id: string, userId: string, data: ReplaceTodoData): Promise<FormattedTodo>;
  patch(id: string, userId: string, data: PatchTodoData): Promise<FormattedTodo>;
  delete(id: string, userId: string): Promise<void>;
}
