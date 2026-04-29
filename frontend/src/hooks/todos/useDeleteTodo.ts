import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useTodosCache } from './useTodosCache'

async function deleteTodoApi(id: string): Promise<string> {
  const res = await apiFetch(`/todos/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('TODOの削除に失敗しました')
  return id
}

export function useDeleteTodo() {
  const { qc, snapshot, rollback } = useTodosCache()

  const handleMutate = async (id: string) => {
    const previous = await snapshot()
    qc.setQueryData<Todo[]>(['todos'], prev => prev?.filter(t => t.id !== id) ?? [])
    return { previous }
  }

  const mutation = useMutation({
    mutationFn: deleteTodoApi,
    onMutate: handleMutate,
    onError: rollback('TODOの削除に失敗しました'),
  })

  return (id: string) => mutation.mutate(id)
}
