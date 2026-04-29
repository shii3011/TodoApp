import type { CSSProperties } from 'react'
import type { Tag } from '../../../types'
import styles from './TagSelector.module.css'
import shared from '../../shared.module.css'

interface Props {
  tags: Tag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export default function TagSelector({ tags, selectedIds, onChange }: Props) {
  if (tags.length === 0) return null
  return (
    <div className={styles.tagSelector}>
      {tags.map(tag => {
        const selected = selectedIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            className={`${shared.tagChip}${selected ? ` ${shared.tagChipSelected}` : ''}`}
            style={{ '--tag-color': tag.color } as CSSProperties}
            onClick={() => onChange(selected
              ? selectedIds.filter(id => id !== tag.id)
              : [...selectedIds, tag.id]
            )}
          >
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}
