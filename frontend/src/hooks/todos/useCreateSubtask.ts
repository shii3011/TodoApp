import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useTodosOptimistic } from './useTodosOptimistic'

export function useCreateSubtask() {
  const { qc, snapshot, rollback } = useTodosOptimistic()

  const mutation = useMutation({
    mutationFn: async ({ parentId, title }: { parentId: string; title: string }): Promise<{ subtask: Todo; parentId: string }> => {
      const res = await apiFetch('/todos', {
        method: 'POST',
        body: JSON.stringify({ title, description: '', priority: 'medium', tagIds: [], parentId }),
      })
      if (!res.ok) throw new Error('サブタスクの作成に失敗しました')
      return { subtask: await res.json() as Todo, parentId }
    },
    onMutate: async ({ parentId, title }) => {
      const previous = await snapshot()
      const optimisticId = `optimistic-${Date.now()}`
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t =>
          t.id === parentId
            ? {
                ...t,
                subtasks: [...t.subtasks, {
                  id: optimisticId,
                  title,
                  description: '',
                  completed: false,
                  priority: 'medium',
                  dueDate: null,
                  tags: [],
                  subtasks: [],
                  parentId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }],
              }
            : t
        ) ?? []
      )
      return { previous, optimisticId }
    },
    onError: rollback('サブタスクの作成に失敗しました'),
    onSuccess: ({ subtask, parentId }, _vars, context) => {
      qc.setQueryData<Todo[]>(['todos'], prev =>
        prev?.map(t =>
          t.id === parentId
            ? { ...t, subtasks: t.subtasks.map(s => s.id === context?.optimisticId ? subtask : s) }
            : t
        ) ?? []
      )
    },
  })

  return (parentId: string, title: string) => mutation.mutate({ parentId, title })
}
