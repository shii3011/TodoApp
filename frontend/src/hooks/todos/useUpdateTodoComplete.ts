import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { replaceTodoKeepingSubtasks, useTodosCache } from './useTodosCache'

async function patchTodoCompleted(id: string, completed: boolean): Promise<Todo> {
  const res = await apiFetch(`/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  })
  if (!res.ok) throw new Error('TODOの更新に失敗しました')
  return res.json() as Promise<Todo>
}

export function useUpdateTodoComplete() {
  const { qc, snapshot, rollback } = useTodosCache()

  const handleMutate = async (todo: Todo) => {
    const previous = await snapshot()
    qc.setQueryData<Todo[]>(['todos'], prev =>
      prev?.map(t => t.id === todo.id ? { ...t, completed: !todo.completed } : t) ?? []
    )
    return { previous }
  }

  const mutation = useMutation({
    mutationFn: (todo: Todo) => patchTodoCompleted(todo.id, !todo.completed),
    onMutate: handleMutate,
    onError: rollback('TODOの更新に失敗しました'),
    onSuccess: (updated) => qc.setQueryData<Todo[]>(['todos'], replaceTodoKeepingSubtasks(updated)),
  })

  return (todo: Todo) => mutation.mutate(todo)
}
