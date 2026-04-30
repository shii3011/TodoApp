import { useQueryClient } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { useSetError } from '../../context/ErrorContext'

/**
 * todos キャッシュに対する共通操作を提供する。
 *
 * snapshot(): 進行中クエリをキャンセルし、現在のキャッシュを返す（onMutate 用）
 * rollback(message): onError 時にキャッシュを復元してエラーを表示する
 */
export function useTodosCache() {
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

/**
 * サーバーから返った Todo でキャッシュを更新する。
 * useUpdateTodoComplete / useUpdateTodo の onSuccess で共通利用。
 */
export function replaceTodo(updated: Todo) {
  return (prev: Todo[] | undefined) =>
    prev?.map(t => t.id === updated.id ? updated : t) ?? []
}
