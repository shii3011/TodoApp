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
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['todos'] })
      const previous = qc.getQueryData<Todo[]>(['todos'])
      qc.setQueryData<Todo[]>(['todos'], prev => prev?.filter(t => t.id !== id) ?? [])
      return { previous }
    },
    onError: (_e: Error, _id, context) => {
      qc.setQueryData(['todos'], context?.previous)
      onError('TODOの削除に失敗しました')
    },
  })

  return (id: string) => mutation.mutate(id)
}
