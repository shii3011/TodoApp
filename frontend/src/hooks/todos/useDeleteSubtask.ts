import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useSetError } from '../../context/ErrorContext'

export function useDeleteSubtask() {
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ parentId, subtaskId }: { parentId: string; subtaskId: string }): Promise<{ parentId: string; subtaskId: string }> => {
      const res = await apiFetch(`/todos/${subtaskId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('サブタスクの削除に失敗しました')
      return { parentId, subtaskId }
    },
    onSuccess: ({ parentId, subtaskId }: { parentId: string; subtaskId: string }) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t =>
          t.id === parentId ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) } : t
        ) ?? []
      )
    },
    onError: (e: Error) => onError(e.message),
  })

  return (parentId: string, subtaskId: string) => mutation.mutate({ parentId, subtaskId })
}
