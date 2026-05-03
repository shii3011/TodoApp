import type { Tag } from '../../features/tags/types'
import type { Todo, TodoForm } from '../../features/todos/types'
import { apiFetch } from '../api'
import type { Repositories } from './types'

const todos = {
  async getAll(): Promise<Todo[]> {
    const res = await apiFetch('/todos')
    if (!res.ok) throw new Error('TODOの取得に失敗しました')
    return res.json() as Promise<Todo[]>
  },

  async create(form: TodoForm): Promise<Todo> {
    const res = await apiFetch('/todos', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      }),
    })
    if (!res.ok) throw new Error('TODOの作成に失敗しました')
    return res.json() as Promise<Todo>
  },

  async update(id: string, form: TodoForm, completed: boolean): Promise<Todo> {
    const res = await apiFetch(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...form,
        completed,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      }),
    })
    if (!res.ok) throw new Error('TODOの更新に失敗しました')
    return res.json() as Promise<Todo>
  },

  async patchCompleted(id: string, completed: boolean): Promise<Todo> {
    const res = await apiFetch(`/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    })
    if (!res.ok) throw new Error('TODOの更新に失敗しました')
    return res.json() as Promise<Todo>
  },

  async delete(id: string): Promise<void> {
    const res = await apiFetch(`/todos/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('TODOの削除に失敗しました')
  },

  async createSubtask(parentId: string, title: string): Promise<{ subtask: Todo; parentId: string }> {
    const res = await apiFetch('/todos', {
      method: 'POST',
      body: JSON.stringify({ title, description: '', priority: 'medium', tagIds: [], parentId }),
    })
    if (!res.ok) throw new Error('サブタスクの作成に失敗しました')
    return { subtask: await res.json() as Todo, parentId }
  },

  async patchSubtaskCompleted(subtask: Todo, parentId: string): Promise<{ updated: Todo; parentId: string }> {
    const res = await apiFetch(`/todos/${subtask.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !subtask.completed }),
    })
    if (!res.ok) throw new Error('サブタスクの更新に失敗しました')
    return { updated: await res.json() as Todo, parentId }
  },

  async deleteSubtask(subtaskId: string): Promise<void> {
    const res = await apiFetch(`/todos/${subtaskId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('サブタスクの削除に失敗しました')
  },
}

const tags = {
  async getAll(): Promise<Tag[]> {
    const res = await apiFetch('/tags')
    if (!res.ok) throw new Error('タグの取得に失敗しました')
    return res.json() as Promise<Tag[]>
  },

  async create(form: { name: string; color: string }): Promise<Tag> {
    const res = await apiFetch('/tags', { method: 'POST', body: JSON.stringify(form) })
    if (!res.ok) throw new Error('タグの作成に失敗しました')
    return res.json() as Promise<Tag>
  },

  async delete(id: string): Promise<string> {
    const res = await apiFetch(`/tags/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('タグの削除に失敗しました')
    return id
  },
}

export const apiRepositories: Repositories = { todos, tags }
