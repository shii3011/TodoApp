import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { useRepository } from '../../context/RepositoryContext'
import { useTodosCache } from './useTodosCache'

export function useDeleteTodo() {
  const { todos: repo } = useRepository()
  const { qc, snapshot, rollback } = useTodosCache()

  const handleMutate = async (id: string) => {
    const previous = await snapshot()
    qc.setQueryData<Todo[]>(['todos'], prev => prev?.filter(t => t.id !== id) ?? [])
    return { previous }
  }

  const mutation = useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onMutate: handleMutate,
    onError: rollback('TODOの削除に失敗しました'),
  })

  return (id: string) => mutation.mutate(id)
}
