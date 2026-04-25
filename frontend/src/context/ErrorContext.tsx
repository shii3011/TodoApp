import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type ErrorContextType = {
  error: string | null
  setError: (msg: string | null) => void
}

const ErrorContext = createContext<ErrorContextType>({ error: null, setError: () => {} })

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null)
  return (
    <ErrorContext.Provider value={{ error, setError }}>
      {children}
    </ErrorContext.Provider>
  )
}

export const useError = () => useContext(ErrorContext)
export const useSetError = () => useContext(ErrorContext).setError
