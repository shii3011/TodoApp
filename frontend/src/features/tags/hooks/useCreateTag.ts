import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Tag } from '../types'
import { useRepository } from '../../../context/RepositoryContext'
import { useSetError } from '../../../context/ErrorContext'

export function useCreateTag() {
  const { tags: repo } = useRepository()
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (form: { name: string; color: string }) => repo.create(form),
    onSuccess: (tag: Tag) => qc.setQueryData<Tag[]>(['tags'], prev => [...(prev ?? []), tag]),
    onError: (e: Error) => onError(e.message),
  })

  return (form: { name: string; color: string }) => mutation.mutate(form)
}
