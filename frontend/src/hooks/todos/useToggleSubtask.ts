import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useTodosOptimistic } from './useTodosOptimistic'

export function useToggleSubtask() {
  const { qc, snapshot, rollback } = useTodosOptimistic()

  const mutation = useMutation({
    mutationFn: async ({ parentId, subtask }: { parentId: string; subtask: Todo }): Promise<{ updated: Todo; parentId: string }> => {
      const res = await apiFetch(`/todos/${subtask.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !subtask.completed }),
      })
      if (!res.ok) throw new Error('サブタスクの更新に失敗しました')
      return { updated: await res.json() as Todo, parentId }
    },
    onMutate: async ({ parentId, subtask }) => {
      const previous = await snapshot()
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t =>
          t.id === parentId
            ? { ...t, subtasks: t.subtasks.map(s => s.id === subtask.id ? { ...s, completed: !subtask.completed } : s) }
            : t
        ) ?? []
      )
      return { previous }
    },
    onError: rollback('サブタスクの更新に失敗しました'),
    onSuccess: ({ updated, parentId }: { updated: Todo; parentId: string }) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t =>
          t.id === parentId ? { ...t, subtasks: t.subtasks.map(s => s.id === updated.id ? updated : s) } : t
        ) ?? []
      )
    },
  })

  return (parentId: string, subtask: Todo) => mutation.mutate({ parentId, subtask })
}
