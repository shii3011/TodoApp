import type { Priority, TodoForm } from '../types'

export const PRIORITY_CONFIG: Record<Priority, { label: string }> = {
  high: { label: '高' },
  medium: { label: '中' },
  low: { label: '低' },
}

export const TAG_COLORS = [
  '#38a8f5', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
] as const

export const EMPTY_FORM: TodoForm = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
  tagIds: [],
}
