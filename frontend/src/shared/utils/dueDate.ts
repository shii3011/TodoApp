import type { DueDateStatus } from '../types'

export function getDueDateInfo(dueDate: string): { label: string; status: DueDateStatus; dateStr: string } {
  const due = new Date(dueDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const dateStr = new Date(dueDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}日超過`, status: 'overdue', dateStr }
  if (diffDays === 0) return { label: '今日まで', status: 'today', dateStr }
  if (diffDays <= 3) return { label: `あと${diffDays}日`, status: 'soon', dateStr }
  return { label: `あと${diffDays}日`, status: 'normal', dateStr }
}
