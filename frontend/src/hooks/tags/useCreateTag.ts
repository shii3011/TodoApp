import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Tag } from '../../types'
import { apiFetch } from '../../lib/api'
import { useSetError } from '../../context/ErrorContext'

async function postTag(form: { name: string; color: string }): Promise<Tag> {
  const res = await apiFetch('/tags', { method: 'POST', body: JSON.stringify(form) })
  if (!res.ok) throw new Error('タグの作成に失敗しました')
  return res.json() as Promise<Tag>
}

export function useCreateTag() {
  const onError = useSetError()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: postTag,
    onSuccess: (tag: Tag) => qc.setQueryData<Tag[]>(['tags'], prev => [...(prev ?? []), tag]),
    onError: (e: Error) => onError(e.message),
  })

  return (form: { name: string; color: string }) => mutation.mutate(form)
}
