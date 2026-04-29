import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import './config/awsConfig'
import './index.css'
import { ErrorProvider } from './context/ErrorContext'
import { RepositoryProvider } from './context/RepositoryContext'
import App from './components/App/App'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Authenticator.Provider>
        <ErrorProvider>
          <RepositoryProvider>
            <App />
          </RepositoryProvider>
        </ErrorProvider>
      </Authenticator.Provider>
    </QueryClientProvider>
  </StrictMode>,
)
