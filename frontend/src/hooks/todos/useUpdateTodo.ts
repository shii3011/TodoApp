import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Todo, TodoForm } from '../../types'
import { apiFetch } from '../../lib/api'
import { useSetError } from '../../context/ErrorContext'

export function useUpdateTodo() {
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ id, form, completed }: { id: string; form: TodoForm; completed: boolean }): Promise<Todo> => {
      const res = await apiFetch(`/todos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          completed,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        }),
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

  return (id: string, form: TodoForm, completed: boolean) => mutation.mutate({ id, form, completed })
}
