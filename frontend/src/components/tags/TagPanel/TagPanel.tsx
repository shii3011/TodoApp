import { useState } from 'react'
import type { CSSProperties } from 'react'
import { TAG_COLORS } from '../../../constants'
import { useReadTags, useCreateTag, useDeleteTag } from '../../../hooks'
import styles from './TagPanel.module.css'
import shared from '../../shared.module.css'

export default function TagPanel() {
  const tags = useReadTags()
  const createTag = useCreateTag()
  const deleteTag = useDeleteTag()
  const [tagForm, setTagForm] = useState<{ name: string; color: string }>({ name: '', color: TAG_COLORS[0] })

  const handleCreate = () => {
    if (!tagForm.name.trim()) return
    createTag(tagForm)
    setTagForm({ name: '', color: TAG_COLORS[0] })
  }

  return (
    <div className={`${styles.tagPanel} ${shared.card}`}>
      <div className={styles.tagPanelHeader}>
        <h3>タグ管理</h3>
      </div>
      <div className={styles.tagPanelBody}>
        {tags.map(tag => (
          <div key={tag.id} className={styles.tagPanelItem}>
            <span
              className={shared.tagChip}
              style={{ '--tag-color': tag.color } as CSSProperties}
            >
              {tag.name}
            </span>
            <button className={styles.tagDeleteBtn} onClick={() => deleteTag(tag.id)}>削除</button>
          </div>
        ))}
      </div>
      <div className={styles.tagCreateForm}>
        <input
          className={`${shared.field} ${styles.tagNameInput}`}
          placeholder="タグ名"
          value={tagForm.name}
          onChange={e => setTagForm({ ...tagForm, name: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
        />
        <div className={styles.colorPicker}>
          {TAG_COLORS.map(color => (
            <button
              key={color}
              className={`${styles.colorSwatch}${tagForm.color === color ? ` ${styles.colorSwatchActive}` : ''}`}
              style={{ background: color }}
              onClick={() => setTagForm({ ...tagForm, color })}
            />
          ))}
        </div>
        <button
          className={shared.submitBtn}
          onClick={handleCreate}
          disabled={!tagForm.name.trim()}
        >
          作成
        </button>
      </div>
    </div>
  )
}
