import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useSetError } from '../../context/ErrorContext'

export function useToggleSubtask() {
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ parentId, subtask }: { parentId: string; subtask: Todo }): Promise<{ updated: Todo; parentId: string }> => {
      const res = await apiFetch(`/todos/${subtask.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !subtask.completed }),
      })
      if (!res.ok) throw new Error('サブタスクの更新に失敗しました')
      return { updated: await res.json() as Todo, parentId }
    },
    onSuccess: ({ updated, parentId }: { updated: Todo; parentId: string }) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t =>
          t.id === parentId ? { ...t, subtasks: t.subtasks.map(s => s.id === updated.id ? updated : s) } : t
        ) ?? []
      )
    },
    onError: (e: Error) => onError(e.message),
  })

  return (parentId: string, subtask: Todo) => mutation.mutate({ parentId, subtask })
}
