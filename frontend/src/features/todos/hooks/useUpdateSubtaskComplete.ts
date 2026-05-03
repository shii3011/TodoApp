import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../types'
import { useRepository } from '../../../context/RepositoryContext'
import { useTodosCache } from './useTodosCache'

export function useUpdateSubtaskComplete() {
  const { todos: repo } = useRepository()
  const { qc, snapshot, rollback } = useTodosCache()

  const handleMutate = async ({ parentId, subtask }: { parentId: string; subtask: Todo }) => {
    const previous = await snapshot()
    qc.setQueryData<Todo[]>(['todos'], prev =>
      prev?.map(t =>
        t.id === parentId
          ? { ...t, subtasks: t.subtasks.map(s => s.id === subtask.id ? { ...s, completed: !subtask.completed } : s) }
          : t
      ) ?? []
    )
    return { previous }
  }

  const handleSuccess = ({ updated, parentId }: { updated: Todo; parentId: string }) => {
    qc.setQueryData<Todo[]>(['todos'], prev =>
      prev?.map(t =>
        t.id === parentId
          ? { ...t, subtasks: t.subtasks.map(s => s.id === updated.id ? updated : s) }
          : t
      ) ?? []
    )
  }

  const mutation = useMutation({
    mutationFn: ({ parentId, subtask }) => repo.patchSubtaskCompleted(subtask, parentId),
    onMutate: handleMutate,
    onError: rollback('サブタスクの更新に失敗しました'),
    onSuccess: handleSuccess,
  })

  return (parentId: string, subtask: Todo) => mutation.mutate({ parentId, subtask })
}
