import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Tag } from '../../types'
import { useRepository } from '../../context/RepositoryContext'
import { useSetError } from '../../context/ErrorContext'

export function useDeleteTag() {
  const { tags: repo } = useRepository()
  const onError = useSetError()
  const qc = useQueryClient()

  const handleSuccess = (id: string) => {
    qc.setQueryData<Tag[]>(['tags'], prev => prev?.filter(t => t.id !== id) ?? [])
    // タグ削除後のtodos更新（APIはサーバー再フェッチ、localStorageは既にrepository内で更新済み）
    void qc.invalidateQueries({ queryKey: ['todos'] })
  }

  const mutation = useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: handleSuccess,
    onError: (e: Error) => onError(e.message),
  })

  return (id: string) => mutation.mutate(id)
}
