import type { KeyboardEvent } from 'react'

/** Enter キー押下時に fn を実行するイベントハンドラを返す */
export const onEnter =
  (fn: () => void) =>
  (e: KeyboardEvent) => {
    if (e.key === 'Enter') fn()
  }
