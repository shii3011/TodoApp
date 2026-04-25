import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useSetError } from '../../context/ErrorContext'

export function useCreateSubtask() {
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ parentId, title }: { parentId: string; title: string }): Promise<{ subtask: Todo; parentId: string }> => {
      const res = await apiFetch('/todos', {
        method: 'POST',
        body: JSON.stringify({ title, description: '', priority: 'medium', tagIds: [], parentId }),
      })
      if (!res.ok) throw new Error('サブタスクの作成に失敗しました')
      return { subtask: await res.json() as Todo, parentId }
    },
    onSuccess: ({ subtask, parentId }: { subtask: Todo; parentId: string }) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t => t.id === parentId ? { ...t, subtasks: [...t.subtasks, subtask] } : t) ?? []
      )
    },
    onError: (e: Error) => onError(e.message),
  })

  return (parentId: string, title: string) => mutation.mutate({ parentId, title })
}
