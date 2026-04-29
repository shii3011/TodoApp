import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useTodosOptimistic } from './useTodosOptimistic'

export function useDeleteSubtask() {
  const { qc, snapshot, rollback } = useTodosOptimistic()

  const mutation = useMutation({
    mutationFn: async ({ subtaskId }: { parentId: string; subtaskId: string }): Promise<void> => {
      const res = await apiFetch(`/todos/${subtaskId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('サブタスクの削除に失敗しました')
    },
    onMutate: async ({ parentId, subtaskId }) => {
      const previous = await snapshot()
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t =>
          t.id === parentId ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) } : t
        ) ?? []
      )
      return { previous }
    },
    onError: rollback('サブタスクの削除に失敗しました'),
  })

  return (parentId: string, subtaskId: string) => mutation.mutate({ parentId, subtaskId })
}
