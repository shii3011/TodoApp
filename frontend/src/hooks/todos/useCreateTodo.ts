import { useMutation } from '@tanstack/react-query'
import type { Tag, Todo, TodoForm } from '../../types'
import { apiFetch } from '../../lib/api'
import { useTodosOptimistic } from './useTodosOptimistic'

export function useCreateTodo() {
  const { qc, snapshot, rollback } = useTodosOptimistic()

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
    onMutate: async (form: TodoForm) => {
      const previous = await snapshot()
      const allTags = qc.getQueryData<Tag[]>(['tags']) ?? []
      const optimisticId = `optimistic-${Date.now()}`
      const optimistic: Todo = {
        id: optimisticId,
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        completed: false,
        tags: allTags.filter(t => form.tagIds.includes(t.id)),
        subtasks: [],
        parentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      qc.setQueryData<Todo[]>(['todos'], prev => [...(prev ?? []), optimistic])
      return { previous, optimisticId }
    },
    onError: rollback('TODOの作成に失敗しました'),
    onSuccess: (todo: Todo, _form, context) => {
      // 仮 ID を実際のサーバー ID に置き換え
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t => t.id === context?.optimisticId ? todo : t) ?? []
      )
    },
  })

  return (form: TodoForm) => mutation.mutate(form)
}
