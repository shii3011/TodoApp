import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Todo, TodoForm, Priority } from '../../../types'
import { PRIORITY_CONFIG } from '../../../constants'
import { getDueDateInfo } from '../../../utils/dueDate'
import { useUpdateTodoComplete, useUpdateTodo, useDeleteTodo, useReadTags } from '../../../hooks'
import TagSelector from '../../tags/TagSelector/TagSelector'
import SubtaskSection from '../SubtaskSection/SubtaskSection'
import styles from './TodoCard.module.css'
import shared from '../../shared.module.css'

interface Props {
  todo: Todo
}

const BADGE_CLASS: Record<string, string> = {
  high: styles.badgeHigh,
  medium: styles.badgeMedium,
  low: styles.badgeLow,
}

const DUE_STATUS_CLASS: Record<string, string> = {
  overdue: styles.dueOverdue,
  today: styles.dueToday,
  soon: styles.dueSoon,
  normal: styles.dueNormal,
}

export default function TodoCard({ todo }: Props) {
  const toggleComplete = useUpdateTodoComplete()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()
  const tags = useReadTags()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<TodoForm>({
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    dueDate: todo.dueDate ? todo.dueDate.slice(0, 10) : '',
    tagIds: todo.tags.map(t => t.id),
  })

  const startEdit = () => {
    setEditForm({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      dueDate: todo.dueDate ? todo.dueDate.slice(0, 10) : '',
      tagIds: todo.tags.map(t => t.id),
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!editForm.title.trim()) return
    updateTodo(todo.id, editForm, todo.completed)
    setIsEditing(false)
  }

  return (
    <li
      className={`${styles.todoCard} ${shared.card}${todo.completed ? ` ${styles.isDone}` : ''}`}
      onDoubleClick={() => !todo.completed && startEdit()}
    >
      {isEditing ? (
        <div className={styles.editBody}>
          <input
            className={shared.field}
            value={editForm.title}
            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
            autoFocus
          />
          <textarea
            className={shared.field}
            rows={3}
            value={editForm.description}
            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
          />
          <TagSelector
            tags={tags}
            selectedIds={editForm.tagIds}
            onChange={tagIds => setEditForm({ ...editForm, tagIds })}
          />
          <div className={shared.formFooter}>
            <select
              className={`${shared.field} ${shared.select}`}
              value={editForm.priority}
              onChange={e => setEditForm({ ...editForm, priority: e.target.value as Priority })}
            >
              <option value="high">🔴 優先度：高</option>
              <option value="medium">🟡 優先度：中</option>
              <option value="low">🟢 優先度：低</option>
            </select>
            <input
              type="date"
              className={shared.field}
              value={editForm.dueDate}
              onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
            />
            <div className={styles.editBtns}>
              <button className={styles.saveBtn} onClick={handleSave}>保存</button>
              <button className={styles.cancelBtn} onClick={() => setIsEditing(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={`${styles.priorityStripe} ${todo.completed ? styles.pDone : styles.pActive}`} />
          <div className={styles.todoBody}>
            {todo.dueDate && (() => {
              const { label, status, dateStr } = getDueDateInfo(todo.dueDate)
              const dueCls = DUE_STATUS_CLASS[todo.completed ? 'normal' : status]
              return (
                <span className={`${styles.dueBadge} ${dueCls}`}>
                  <span className={styles.dueIcon}>{status === 'overdue' && !todo.completed ? '⚠' : '📅'}</span>
                  <span className={styles.dueDateStr}>{dateStr}</span>
                  {!todo.completed && <span className={styles.dueLabel}>{label}</span>}
                </span>
              )
            })()}
            <div className={styles.todoTop}>
              <label className={shared.checkLabel}>
                <input type="checkbox" checked={todo.completed} onChange={() => toggleComplete(todo)} />
                <span className={shared.checkBox} />
                <span className={`${styles.todoTitle}${todo.completed ? ` ${shared.struck}` : ''}`}>
                  {todo.title}
                </span>
              </label>
              <div className={styles.todoActions}>
                <span className={`${styles.badge} ${BADGE_CLASS[todo.priority]}`}>
                  {PRIORITY_CONFIG[todo.priority].label}
                </span>
                <button className={shared.iconBtn} onClick={startEdit} title="編集">✏️</button>
                <button className={`${shared.iconBtn} ${shared.iconBtnDel}`} onClick={() => deleteTodo(todo.id)} title="削除">🗑️</button>
              </div>
            </div>
            {todo.description && <p className={styles.todoDesc}>{todo.description}</p>}
            {todo.tags.length > 0 && (
              <div className={styles.todoTags}>
                {todo.tags.map(tag => (
                  <span
                    key={tag.id}
                    className={`${shared.tagChip} ${shared.tagChipSmall}`}
                    style={{ '--tag-color': tag.color } as CSSProperties}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            <div className={styles.todoMeta}>
              <time className={styles.todoDate}>
                作成: {new Date(todo.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            </div>
            <SubtaskSection todo={todo} />
          </div>
        </>
      )}
    </li>
  )
}
