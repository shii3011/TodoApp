import { useQueryClient } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { useSetError } from '../../context/ErrorContext'

/**
 * todos キャッシュに対する楽観的更新の共通処理を提供する。
 *
 * snapshot(): 進行中クエリをキャンセルし、現在のキャッシュを返す（onMutate 用）
 * rollback(message): onError 時にキャッシュを復元してエラーを表示する
 */
export function useTodosOptimistic() {
  const qc = useQueryClient()
  const setError = useSetError()

  const snapshot = async () => {
    await qc.cancelQueries({ queryKey: ['todos'] })
    return qc.getQueryData<Todo[]>(['todos'])
  }

  const rollback =
    (message: string) =>
    (_e: Error, _vars: unknown, context?: { previous: Todo[] | undefined }) => {
      qc.setQueryData(['todos'], context?.previous)
      setError(message)
    }

  return { qc, snapshot, rollback }
}
