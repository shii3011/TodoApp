import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useSetError } from '../../context/ErrorContext'

export function useToggleTodo() {
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (todo: Todo): Promise<Todo> => {
      const res = await apiFetch(`/todos/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !todo.completed }),
      })
      if (!res.ok) throw new Error('TODOの更新に失敗しました')
      return res.json() as Promise<Todo>
    },
    onSuccess: (updated: Todo) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t => t.id === updated.id ? { ...updated, subtasks: t.subtasks } : t) ?? []
      )
    },
    onError: (e: Error) => onError(e.message),
  })

  return (todo: Todo) => mutation.mutate(todo)
}
