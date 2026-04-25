export type Priority = 'low' | 'medium' | 'high'
export type StatusFilter = 'all' | 'active' | 'completed'
export type DueDateStatus = 'overdue' | 'today' | 'soon' | 'normal'

export interface Tag {
  id: string
  name: string
  color: string
}

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

