import type { Tag, Todo, TodoForm } from '../../types'

export interface TodoRepository {
  getAll(): Promise<Todo[]>
  create(form: TodoForm): Promise<Todo>
  update(id: string, form: TodoForm, completed: boolean): Promise<Todo>
  patchCompleted(id: string, completed: boolean): Promise<Todo>
  delete(id: string): Promise<void>
  createSubtask(parentId: string, title: string): Promise<{ subtask: Todo; parentId: string }>
  patchSubtaskCompleted(subtask: Todo, parentId: string): Promise<{ updated: Todo; parentId: string }>
  deleteSubtask(subtaskId: string): Promise<void>
}

export interface TagRepository {
  getAll(): Promise<Tag[]>
  create(form: { name: string; color: string }): Promise<Tag>
  delete(id: string): Promise<string>
}

export interface Repositories {
  todos: TodoRepository
  tags: TagRepository
}
