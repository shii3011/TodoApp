import { useState } from 'react'
import type { TodoForm as TodoFormType, Priority } from '../../../types'
import { EMPTY_FORM } from '../../../constants'
import { useCreateTodo, useReadTags } from '../../../hooks'
import TagSelector from '../../tags/TagSelector/TagSelector'
import styles from './TodoForm.module.css'
import shared from '../../shared.module.css'

interface Props {
  onSuccess: () => void
}

export default function TodoForm({ onSuccess }: Props) {
  const createTodo = useCreateTodo()
  const tags = useReadTags()
  const [form, setForm] = useState<TodoFormType>(EMPTY_FORM)

  const handleSubmit = () => {
    createTodo(form)
    setForm(EMPTY_FORM)
    onSuccess()
  }

  return (
    <div className={`${styles.formCard} ${shared.card}`}>
      <h2 className={styles.formHeading}>新しいTODOを追加</h2>
      <input
        className={shared.field}
        placeholder="タイトル *"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        autoFocus
      />
      <textarea
        className={shared.field}
        placeholder="詳細（任意）"
        rows={3}
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
      />
      <TagSelector
        tags={tags}
        selectedIds={form.tagIds}
        onChange={tagIds => setForm({ ...form, tagIds })}
      />
      <div className={shared.formFooter}>
        <select
          className={`${shared.field} ${shared.select}`}
          value={form.priority}
          onChange={e => setForm({ ...form, priority: e.target.value as Priority })}
        >
          <option value="high">🔴 優先度：高</option>
          <option value="medium">🟡 優先度：中</option>
          <option value="low">🟢 優先度：低</option>
        </select>
        <input
          type="date"
          className={shared.field}
          value={form.dueDate}
          onChange={e => setForm({ ...form, dueDate: e.target.value })}
        />
        <button
          className={shared.submitBtn}
          onClick={handleSubmit}
          disabled={!form.title.trim()}
        >
          追加する
        </button>
      </div>
    </div>
  )
}
