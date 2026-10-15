import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider, useAuth } from './auth'
import { LoginPage } from './features/auth/LoginPage'
import { PublishersProvider } from './features/publishers/catalog'
import { MeetingsProvider } from './store'
import { ThemeSync } from './theme'
import './index.css'

function Gate() {
  const authState = useAuth()
  if (authState.status === 'loading') {
    return (
      <div className="grid min-h-full place-items-center bg-canvas text-sm text-muted">
        Carregando…
      </div>
    )
  }
  if (authState.status === 'signedOut' || authState.account.mustChangePassword) {
    return <LoginPage />
  }
  return (
    <PublishersProvider>
      <MeetingsProvider congregationId={authState.account.congregationId}>
        <App />
      </MeetingsProvider>
    </PublishersProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeSync />
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

