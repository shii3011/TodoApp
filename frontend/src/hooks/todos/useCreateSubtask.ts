import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { useRepository } from '../../context/RepositoryContext'
import { useTodosCache } from './useTodosCache'

function buildOptimisticSubtask(parentId: string, title: string): Todo {
  return {
    id: `optimistic-${Date.now()}`,
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
  }
}

export function useCreateSubtask() {
  const { todos: repo } = useRepository()
  const { qc, snapshot, rollback } = useTodosCache()

  const handleMutate = async ({ parentId, title }: { parentId: string; title: string }) => {
    const previous = await snapshot()
    const optimistic = buildOptimisticSubtask(parentId, title)
    qc.setQueryData<Todo[]>(['todos'], prev =>
      prev?.map(t => t.id === parentId ? { ...t, subtasks: [...t.subtasks, optimistic] } : t) ?? []
    )
    return { previous, optimisticId: optimistic.id }
  }

  const handleSuccess = (
    { subtask, parentId }: { subtask: Todo; parentId: string },
    _vars: unknown,
    context?: { optimisticId: string },
  ) => {
    qc.setQueryData<Todo[]>(['todos'], prev =>
      prev?.map(t =>
        t.id === parentId
          ? { ...t, subtasks: t.subtasks.map(s => s.id === context?.optimisticId ? subtask : s) }
          : t
      ) ?? []
    )
  }

  const mutation = useMutation({
    mutationFn: ({ parentId, title }) => repo.createSubtask(parentId, title),
    onMutate: handleMutate,
    onError: rollback('サブタスクの作成に失敗しました'),
    onSuccess: handleSuccess,
  })

  return (parentId: string, title: string) => mutation.mutate({ parentId, title })
}
