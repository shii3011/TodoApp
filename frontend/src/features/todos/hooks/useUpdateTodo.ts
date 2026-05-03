import { useMutation } from '@tanstack/react-query'
import type { Tag, Todo, TodoForm } from '../types'
import { useRepository } from '../../../context/RepositoryContext'
import { replaceTodo, useTodosCache } from './useTodosCache'

export function useUpdateTodo() {
  const { todos: repo } = useRepository()
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
    mutationFn: ({ id, form, completed }) => repo.update(id, form, completed),
    onMutate: handleMutate,
    onError: rollback('TODOの更新に失敗しました'),
    onSuccess: (updated) => qc.setQueryData<Todo[]>(['todos'], replaceTodo(updated)),
  })

  return (id: string, form: TodoForm, completed: boolean) => mutation.mutate({ id, form, completed })
}
