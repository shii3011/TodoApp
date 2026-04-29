import { createContext, useContext, useMemo, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { apiRepositories } from '../lib/repositories/apiRepository'
import { localStorageRepositories } from '../lib/repositories/localStorageRepository'
import type { Repositories } from '../lib/repositories/types'

const RepositoryContext = createContext<Repositories | null>(null)

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const { authStatus } = useAuthenticator(ctx => [ctx.authStatus])
  const isGuest = authStatus !== 'authenticated'
  const qc = useQueryClient()
  const prevAuthStatus = useRef(authStatus)

  const repos = useMemo(
    () => (isGuest ? localStorageRepositories : apiRepositories),
    [isGuest],
  )

  // 認証状態が変わったらキャッシュをリセットして再フェッチ
  useEffect(() => {
    if (prevAuthStatus.current !== authStatus) {
      prevAuthStatus.current = authStatus
      void qc.resetQueries()
    }
  }, [authStatus, qc])

  return (
    <RepositoryContext.Provider value={repos}>
      {children}
    </RepositoryContext.Provider>
  )
}

export function useRepository(): Repositories {
  const ctx = useContext(RepositoryContext)
  if (!ctx) throw new Error('useRepository must be used within RepositoryProvider')
  return ctx
}
