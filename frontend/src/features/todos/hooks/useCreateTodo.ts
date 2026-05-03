import { useMutation } from '@tanstack/react-query'
import type { Tag, Todo, TodoForm } from '../types'
import { useRepository } from '../../../context/RepositoryContext'
import { useTodosCache } from './useTodosCache'

function buildOptimisticTodo(form: TodoForm, allTags: Tag[]): Todo {
  return {
    id: `optimistic-${Date.now()}`,
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
}

export function useCreateTodo() {
  const { todos: repo } = useRepository()
  const { qc, snapshot, rollback } = useTodosCache()

  const handleMutate = async (form: TodoForm) => {
    const previous = await snapshot()
    const optimistic = buildOptimisticTodo(form, qc.getQueryData<Tag[]>(['tags']) ?? [])
    qc.setQueryData<Todo[]>(['todos'], prev => [...(prev ?? []), optimistic])
    return { previous, optimisticId: optimistic.id }
  }

  const handleSuccess = (todo: Todo, _form: TodoForm, context?: { optimisticId: string }) => {
    qc.setQueryData<Todo[]>(['todos'], prev =>
      prev?.map(t => t.id === context?.optimisticId ? todo : t) ?? []
    )
  }

  const mutation = useMutation({
    mutationFn: (form: TodoForm) => repo.create(form),
    onMutate: handleMutate,
    onError: rollback('TODOの作成に失敗しました'),
    onSuccess: handleSuccess,
  })

  return (form: TodoForm) => mutation.mutate(form)
}
