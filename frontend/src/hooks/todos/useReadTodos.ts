import { useQuery } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { useRepository } from '../../context/RepositoryContext'

export function useReadTodos() {
  const { todos: repo } = useRepository()
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: (): Promise<Todo[]> => repo.getAll(),
  })
  return { todos, isLoading }
}
