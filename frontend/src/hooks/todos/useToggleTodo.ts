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
    onMutate: async (todo: Todo) => {
      await qc.cancelQueries({ queryKey: ['todos'] })
      const previous = qc.getQueryData<Todo[]>(['todos'])
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t => t.id === todo.id ? { ...t, completed: !todo.completed } : t) ?? []
      )
      return { previous }
    },
    onError: (_e: Error, _todo, context) => {
      qc.setQueryData(['todos'], context?.previous)
      onError('TODOの更新に失敗しました')
    },
    onSuccess: (updated: Todo) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t => t.id === updated.id ? { ...updated, subtasks: t.subtasks } : t) ?? []
      )
    },
  })

  return (todo: Todo) => mutation.mutate(todo)
}
