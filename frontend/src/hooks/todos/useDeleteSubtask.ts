import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { useRepository } from '../../context/RepositoryContext'
import { useTodosCache } from './useTodosCache'

export function useDeleteSubtask() {
  const { todos: repo } = useRepository()
  const { qc, snapshot, rollback } = useTodosCache()

  const handleMutate = async ({ parentId, subtaskId }: { parentId: string; subtaskId: string }) => {
    const previous = await snapshot()
    qc.setQueryData<Todo[]>(['todos'], prev =>
      prev?.map(t =>
        t.id === parentId ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) } : t
      ) ?? []
    )
    return { previous }
  }

  const mutation = useMutation({
    mutationFn: ({ subtaskId }) => repo.deleteSubtask(subtaskId),
    onMutate: handleMutate,
    onError: rollback('サブタスクの削除に失敗しました'),
  })

  return (parentId: string, subtaskId: string) => mutation.mutate({ parentId, subtaskId })
}
