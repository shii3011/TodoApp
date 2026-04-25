import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Todo, TodoForm } from '../../types'
import { apiFetch } from '../../lib/api'
import { useSetError } from '../../context/ErrorContext'

export function useCreateTodo() {
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (form: TodoForm): Promise<Todo> => {
      const res = await apiFetch('/todos', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        }),
      })
      if (!res.ok) throw new Error('TODOの作成に失敗しました')
      return res.json() as Promise<Todo>
    },
    onSuccess: (todo: Todo) => {
      qc.setQueryData<Todo[]>(['todos'], prev => [...(prev ?? []), todo])
    },
    onError: (e: Error) => onError(e.message),
  })

  return (form: TodoForm) => mutation.mutate(form)
}
