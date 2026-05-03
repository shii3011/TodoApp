import { useQuery } from '@tanstack/react-query'
import type { Tag } from '../types'
import { useRepository } from '../../../context/RepositoryContext'

export function useReadTags() {
  const { tags: repo } = useRepository()
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: (): Promise<Tag[]> => repo.getAll(),
  })
  return tags
}
