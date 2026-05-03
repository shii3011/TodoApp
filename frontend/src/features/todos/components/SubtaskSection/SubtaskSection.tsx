import { useState } from 'react'
import type { Todo } from '../../types'
import { useCreateSubtask, useUpdateSubtaskComplete, useDeleteSubtask } from '../../hooks'
import { onEnter } from '../../../../shared/utils/keyboard'
import styles from './SubtaskSection.module.css'
import shared from '../../../../shared/components/shared.module.css'

interface Props {
  todo: Todo
}

export default function SubtaskSection({ todo }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [subtaskInput, setSubtaskInput] = useState('')
  const createSubtask = useCreateSubtask()
  const updateSubtaskComplete = useUpdateSubtaskComplete()
  const deleteSubtask = useDeleteSubtask()

  const handleCreate = () => {
    if (!subtaskInput.trim()) return
    createSubtask(todo.id, subtaskInput.trim())
    setSubtaskInput('')
  }

  return (
    <div className={styles.subtaskSection}>
      <button className={styles.subtaskToggle} onClick={() => setIsExpanded(v => !v)}>
        <span className={`${styles.subtaskArrow}${isExpanded ? ` ${styles.subtaskArrowOpen}` : ''}`}>▸</span>
        サブタスク
        {todo.subtasks.length > 0 && (
          <span className={styles.subtaskCount}>
            {todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className={styles.subtaskBody}>
          {todo.subtasks.map(subtask => (
            <div key={subtask.id} className={styles.subtaskItem}>
              <label className={shared.checkLabel}>
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={() => updateSubtaskComplete(todo.id, subtask)}
                />
                <span className={`${shared.checkBox} ${shared.checkBoxSmall}`} />
                <span
                  className={`${styles.subtaskTitle}${subtask.completed ? ` ${shared.struck}` : ''}`}
                  onClick={e => e.preventDefault()}
                >
                  {subtask.title}
                </span>
              </label>
              <button
                className={`${shared.iconBtn} ${shared.iconBtnDel}`}
                onClick={() => deleteSubtask(todo.id, subtask.id)}
                title="削除"
              >🗑️</button>
            </div>
          ))}
          <div className={styles.subtaskAdd}>
            <input
              className={styles.subtaskInput}
              placeholder="サブタスクを追加..."
              value={subtaskInput}
              onChange={e => setSubtaskInput(e.target.value)}
              onKeyDown={onEnter(handleCreate)}
            />
            <button
              className={styles.subtaskAddBtn}
              onClick={handleCreate}
              disabled={!subtaskInput.trim()}
            >追加</button>
          </div>
        </div>
      )}
    </div>
  )
}
