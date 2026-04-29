import { useQuery } from '@tanstack/react-query'
import type { Todo } from '../../types'
import { apiFetch } from '../../lib/api'

export function useReadTodos() {
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: async (): Promise<Todo[]> => {
      const res = await apiFetch('/todos')
      if (!res.ok) throw new Error('TODOの取得に失敗しました')
      return res.json() as Promise<Todo[]>
    },
  })
  return { todos, isLoading }
}
