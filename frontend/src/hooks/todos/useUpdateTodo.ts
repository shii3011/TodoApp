import { useMutation } from '@tanstack/react-query'
import type { Tag, Todo, TodoForm } from '../../types'
import { apiFetch } from '../../lib/api'
import { replaceTodoKeepingSubtasks, useTodosCache } from './useTodosCache'

async function putTodo(id: string, form: TodoForm, completed: boolean): Promise<Todo> {
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
}

export function useUpdateTodo() {
  const { qc, snapshot, rollback } = useTodosCache()

  const handleMutate = async ({ id, form, completed }: { id: string; form: TodoForm; completed: boolean }) => {
    const previous = await snapshot()
    const allTags = qc.getQueryData<Tag[]>(['tags']) ?? []
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
              tags: allTags.filter(tag => form.tagIds.includes(tag.id)),
            }
          : t
      ) ?? []
    )
    return { previous }
  }

  const mutation = useMutation({
    mutationFn: ({ id, form, completed }) => putTodo(id, form, completed),
    onMutate: handleMutate,
    onError: rollback('TODOの更新に失敗しました'),
    onSuccess: (updated) => qc.setQueryData<Todo[]>(['todos'], replaceTodoKeepingSubtasks(updated)),
  })

  return (id: string, form: TodoForm, completed: boolean) => mutation.mutate({ id, form, completed })
}
