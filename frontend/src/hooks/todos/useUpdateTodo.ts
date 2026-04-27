import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Tag, Todo, TodoForm } from '../../types'
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
    onMutate: async ({ id, form, completed }) => {
      await qc.cancelQueries({ queryKey: ['todos'] })
      const previous = qc.getQueryData<Todo[]>(['todos'])
      const allTags = qc.getQueryData<Tag[]>(['tags']) ?? []
      const optimisticTags = allTags.filter(t => form.tagIds.includes(t.id))
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t =>
          t.id === id
            ? {
                ...t,
                title: form.title,
                description: form.description,
                priority: form.priority,
                completed,
                dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
                tags: optimisticTags,
              }
            : t
        ) ?? []
      )
      return { previous }
    },
    onError: (_e: Error, _input, context) => {
      qc.setQueryData(['todos'], context?.previous)
      onError('TODOの更新に失敗しました')
    },
    onSuccess: (updated: Todo) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t => t.id === updated.id ? { ...updated, subtasks: t.subtasks } : t) ?? []
      )
    },
  })

  return (id: string, form: TodoForm, completed: boolean) => mutation.mutate({ id, form, completed })
}
