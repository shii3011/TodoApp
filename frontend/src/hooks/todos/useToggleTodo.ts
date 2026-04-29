import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useTodosOptimistic } from './useTodosOptimistic'

export function useToggleTodo() {
  const { qc, snapshot, rollback } = useTodosOptimistic()

  const mutation = useMutation({
    mutationFn: async (todo: Todo): Promise<Todo> => {
      const res = await apiFetch(`/todos/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !todo.completed }),
      })
      if (!res.ok) throw new Error('TODOの更新に失敗しました')
      return res.json() as Promise<Todo>
    },
    onMutate: async (todo: Todo) => {
      const previous = await snapshot()
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t => t.id === todo.id ? { ...t, completed: !todo.completed } : t) ?? []
      )
      return { previous }
    },
    onError: rollback('TODOの更新に失敗しました'),
    onSuccess: (updated: Todo) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t => t.id === updated.id ? { ...updated, subtasks: t.subtasks } : t) ?? []
      )
    },
  })

  return (todo: Todo) => mutation.mutate(todo)
}
