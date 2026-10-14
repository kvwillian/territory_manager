import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider, useAuth } from './auth'
import { LoginPage } from './features/auth/LoginPage'
import { MeetingsProvider } from './store'
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
    <MeetingsProvider congregationId={authState.account.congregationId}>
      <App />
    </MeetingsProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

