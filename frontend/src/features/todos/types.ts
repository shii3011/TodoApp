import type { Tag } from '../tags/types'
export type { Tag } from '../tags/types'

export type Priority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  priority: Priority
  dueDate: string | null
  tags: Tag[]
  subtasks: Todo[]
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface TodoForm {
  title: string
  description: string
  priority: Priority
  dueDate: string
  tagIds: string[]
}
