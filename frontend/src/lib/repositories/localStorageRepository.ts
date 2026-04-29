import type { Tag, Todo, TodoForm } from '../../types'
import type { Repositories } from './types'

const TODOS_KEY = 'guest_todos'
const TAGS_KEY = 'guest_tags'

function loadTodos(): Todo[] {
  return JSON.parse(localStorage.getItem(TODOS_KEY) ?? '[]') as Todo[]
}
function saveTodos(todos: Todo[]): void {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos))
}
function loadTags(): Tag[] {
  return JSON.parse(localStorage.getItem(TAGS_KEY) ?? '[]') as Tag[]
}
function saveTags(tags: Tag[]): void {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
}

const todos = {
  async getAll(): Promise<Todo[]> {
    return loadTodos()
  },

  async create(form: TodoForm): Promise<Todo> {
    const all = loadTodos()
    const tags = loadTags()
    const todo: Todo = {
      id: crypto.randomUUID(),
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      completed: false,
      tags: tags.filter(t => form.tagIds.includes(t.id)),
      subtasks: [],
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveTodos([...all, todo])
    return todo
  },

  async update(id: string, form: TodoForm, completed: boolean): Promise<Todo> {
    const all = loadTodos()
    const tags = loadTags()
    const existing = all.find(t => t.id === id)
    if (!existing) throw new Error('TODOが見つかりません')
    const updated: Todo = {
      ...existing,
      title: form.title,
      description: form.description,
      priority: form.priority,
      completed,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      tags: tags.filter(t => form.tagIds.includes(t.id)),
      updatedAt: new Date().toISOString(),
    }
    saveTodos(all.map(t => t.id === id ? updated : t))
    return updated
  },

  async patchCompleted(id: string, completed: boolean): Promise<Todo> {
    const all = loadTodos()
    const existing = all.find(t => t.id === id)
    if (!existing) throw new Error('TODOが見つかりません')
    const updated: Todo = { ...existing, completed, updatedAt: new Date().toISOString() }
    saveTodos(all.map(t => t.id === id ? updated : t))
    return updated
  },

  async delete(id: string): Promise<void> {
    saveTodos(loadTodos().filter(t => t.id !== id))
  },

  async createSubtask(parentId: string, title: string): Promise<{ subtask: Todo; parentId: string }> {
    const all = loadTodos()
    const subtask: Todo = {
      id: crypto.randomUUID(),
      title,
      description: '',
      completed: false,
      priority: 'medium',
      dueDate: null,
      tags: [],
      subtasks: [],
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveTodos(all.map(t => t.id === parentId ? { ...t, subtasks: [...t.subtasks, subtask] } : t))
    return { subtask, parentId }
  },

  async patchSubtaskCompleted(subtask: Todo, parentId: string): Promise<{ updated: Todo; parentId: string }> {
    const all = loadTodos()
    const updated: Todo = { ...subtask, completed: !subtask.completed, updatedAt: new Date().toISOString() }
    saveTodos(all.map(t =>
      t.id === parentId
        ? { ...t, subtasks: t.subtasks.map(s => s.id === subtask.id ? updated : s) }
        : t
    ))
    return { updated, parentId }
  },

  async deleteSubtask(subtaskId: string): Promise<void> {
    saveTodos(loadTodos().map(t => ({
      ...t,
      subtasks: t.subtasks.filter(s => s.id !== subtaskId),
    })))
  },
}

const tags = {
  async getAll(): Promise<Tag[]> {
    return loadTags()
  },

  async create(form: { name: string; color: string }): Promise<Tag> {
    const all = loadTags()
    const tag: Tag = { id: crypto.randomUUID(), name: form.name, color: form.color }
    saveTags([...all, tag])
    return tag
  },

  async delete(id: string): Promise<string> {
    saveTags(loadTags().filter(t => t.id !== id))
    // タグ削除に伴い todos からも参照を除去
    saveTodos(loadTodos().map(t => ({ ...t, tags: t.tags.filter(tag => tag.id !== id) })))
    return id
  },
}

export const localStorageRepositories: Repositories = { todos, tags }
