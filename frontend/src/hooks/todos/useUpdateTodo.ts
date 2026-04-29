import { useMutation } from '@tanstack/react-query'
import type { Tag, Todo, TodoForm } from '../../types'
import { apiFetch } from '../../lib/api'
import { useTodosOptimistic } from './useTodosOptimistic'

export function useUpdateTodo() {
  const { qc, snapshot, rollback } = useTodosOptimistic()

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
      const previous = await snapshot()
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
    onError: rollback('TODOの更新に失敗しました'),
    onSuccess: (updated: Todo) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t => t.id === updated.id ? { ...updated, subtasks: t.subtasks } : t) ?? []
      )
    },
  })

  return (id: string, form: TodoForm, completed: boolean) => mutation.mutate({ id, form, completed })
}
