import { useMutation } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'
import { useTodosCache } from './useTodosCache'

async function patchSubtaskCompleted(subtask: Todo, parentId: string): Promise<{ updated: Todo; parentId: string }> {
  const res = await apiFetch(`/todos/${subtask.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed: !subtask.completed }),
  })
  if (!res.ok) throw new Error('サブタスクの更新に失敗しました')
  return { updated: await res.json() as Todo, parentId }
}

export function useUpdateSubtaskComplete() {
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
    mutationFn: ({ parentId, subtask }) => patchSubtaskCompleted(subtask, parentId),
    onMutate: handleMutate,
    onError: rollback('サブタスクの更新に失敗しました'),
    onSuccess: handleSuccess,
  })

  return (parentId: string, subtask: Todo) => mutation.mutate({ parentId, subtask })
}
