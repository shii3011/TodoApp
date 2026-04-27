import { useEffect } from 'react'

interface Handlers {
  onNewTodo: () => void
  onEscape: () => void
}

/**
 * アプリ全体のキーボードショートカット
 *
 * N       → 新しいTODOフォームを開く（input/textarea/select フォーカス中は無視）
 * Escape  → 開いているフォーム・パネルを閉じる（input フォーカス中もブラー+閉じる）
 */
export function useKeyboardShortcuts({ onNewTodo, onEscape }: Handlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName

      if (e.key === 'Escape') {
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          ;(e.target as HTMLElement).blur()
        }
        onEscape()
        return
      }

      // 入力中は N ショートカットを無視
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        onNewTodo()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNewTodo, onEscape])
}
