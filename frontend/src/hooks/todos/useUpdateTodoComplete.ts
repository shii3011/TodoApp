import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { useRepository } from '../../context/RepositoryContext'
import { replaceTodo, useTodosCache } from './useTodosCache'

export function useUpdateTodoComplete() {
  const { todos: repo } = useRepository()
  const { qc, snapshot, rollback } = useTodosCache()

  const handleMutate = async (todo: Todo) => {
    const previous = await snapshot()
    qc.setQueryData<Todo[]>(['todos'], prev =>
      prev?.map(t => t.id === todo.id ? { ...t, completed: !todo.completed } : t) ?? []
    )
    return { previous }
  }

  const mutation = useMutation({
    mutationFn: (todo: Todo) => repo.patchCompleted(todo.id, !todo.completed),
    onMutate: handleMutate,
    onError: rollback('TODOの更新に失敗しました'),
    onSuccess: (updated) => qc.setQueryData<Todo[]>(['todos'], replaceTodo(updated)),
  })

  return (todo: Todo) => mutation.mutate(todo)
}
