import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useTodosOptimistic } from './useTodosOptimistic'

export function useDeleteTodo() {
  const { qc, snapshot, rollback } = useTodosOptimistic()

  const mutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await apiFetch(`/todos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('TODOの削除に失敗しました')
      return id
    },
    onMutate: async (id: string) => {
      const previous = await snapshot()
      qc.setQueryData<Todo[]>(['todos'], prev => prev?.filter(t => t.id !== id) ?? [])
      return { previous }
    },
    onError: rollback('TODOの削除に失敗しました'),
  })

  return (id: string) => mutation.mutate(id)
}
