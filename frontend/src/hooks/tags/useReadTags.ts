import { useQuery } from '@tanstack/react-query'
import type { Tag } from '../../types'
import { apiFetch } from '../../lib/api'

export function useReadTags() {
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async (): Promise<Tag[]> => {
      const res = await apiFetch('/tags')
      if (!res.ok) throw new Error('タグの取得に失敗しました')
      return res.json() as Promise<Tag[]>
    },
  })
  return tags
}
