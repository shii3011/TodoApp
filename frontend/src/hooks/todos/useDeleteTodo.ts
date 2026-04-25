import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useSetError } from '../../context/ErrorContext'

export function useDeleteTodo() {
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await apiFetch(`/todos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('TODOの削除に失敗しました')
      return id
    },
    onSuccess: (id: string) => {
      qc.setQueryData<Todo[]>(['todos'], prev => prev?.filter(t => t.id !== id) ?? [])
    },
    onError: (e: Error) => onError(e.message),
  })

  return (id: string) => mutation.mutate(id)
}
