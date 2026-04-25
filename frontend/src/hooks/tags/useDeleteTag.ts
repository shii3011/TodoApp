import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Tag } from '../../types'
import { apiFetch } from '../../lib/api'
import { useSetError } from '../../context/ErrorContext'

export function useDeleteTag() {
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await apiFetch(`/tags/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('タグの削除に失敗しました')
      return id
    },
    onSuccess: (id: string) => {
      qc.setQueryData<Tag[]>(['tags'], prev => prev?.filter(t => t.id !== id) ?? [])
      // タグ削除後のtodos更新はサーバーの最新状態に委ねる（クロスドメイン直接操作を避ける）
      void qc.invalidateQueries({ queryKey: ['todos'] })
    },
    onError: (e: Error) => onError(e.message),
  })

  return (id: string) => mutation.mutate(id)
}
