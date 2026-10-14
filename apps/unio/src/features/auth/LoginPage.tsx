import { useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { doc, updateDoc } from 'firebase/firestore'
import { Eye, EyeOff } from 'lucide-react'
import { auth, db, functions } from '../../firebase'
import { useAccount, useReloadAccount } from '../../auth'

function authMessage(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : ''
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique e tente novamente.'
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este e-mail.'
    case 'auth/invalid-email':
      return 'E-mail inválido. Verifique o formato.'
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Entre em contato com o administrador.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique sua internet e tente novamente.'
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.'
    default:
      return 'Não foi possível entrar. Tente novamente.'
  }
}

export function LoginPage() {
  const account = useAccount()
  if (account?.mustChangePassword) return <ChangePassword />
  return <SignIn />
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hidden, setHidden] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(authMessage(err))
      setLoading(false)
    }
  }

  async function resetPassword() {
    setError('')
    setInfo('')
    if (!email.includes('@')) {
      setError('Digite seu e-mail para receber a senha temporária.')
      return
    }
    setResetting(true)
    try {
      const call = httpsCallable(functions, 'requestPasswordReset')
      await call({ email: email.trim() })
      setInfo('Se essa conta existir, enviamos uma senha temporária para o e-mail.')
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setResetting(false)
    }
  }

  return (
    <main className="grid min-h-full place-items-center bg-canvas px-4 py-10">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo text-lg font-semibold text-white">
            U
          </span>
          <h1 className="mt-4 text-[28px] font-semibold tracking-tight">Unio</h1>
          <p className="mt-1 text-sm text-muted">Gestão da congregação</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6">
          <label className="block text-sm font-medium">
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className="mt-1 h-12 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-indigo"
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Senha
            <span className="relative mt-1 block">
              <input
                type={hidden ? 'password' : 'text'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-xl border border-line px-3 pr-11 text-sm outline-none focus:border-indigo"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                onClick={() => setHidden((value) => !value)}
                aria-label={hidden ? 'Mostrar senha' : 'Ocultar senha'}
              >
                {hidden ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </span>
          </label>
          {error ? <p className="mt-4 rounded-xl bg-[#FDE8EF] px-3 py-2 text-sm text-[#9F1239]">{error}</p> : null}
          {info ? <p className="mt-4 rounded-xl bg-[#ECFDF5] px-3 py-2 text-sm text-[#047857]">{info}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-12 w-full rounded-xl bg-indigo text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
          <button
            type="button"
            disabled={resetting}
            onClick={() => void resetPassword()}
            className="mt-2 h-10 w-full text-sm font-medium text-indigo"
          >
            {resetting ? 'Enviando…' : 'Esqueci minha senha'}
          </button>
        </div>
      </form>
    </main>
  )
}

function ChangePassword() {
  const account = useAccount()
  const reload = useReloadAccount()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const user = auth.currentUser
    if (!user || !account) return
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await updatePassword(user, password)
      await updateDoc(doc(db, 'users', account.uid), { mustChangePassword: false })
      await reload()
    } catch (err) {
      setError(authMessage(err))
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-full place-items-center bg-canvas px-4 py-10">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md rounded-2xl border border-line bg-white p-6">
        <h1 className="text-xl font-semibold">Escolha uma senha nova</h1>
        <p className="mt-1 text-sm text-muted">A senha temporária vale só até esta troca.</p>
        <label className="mt-5 block text-sm font-medium">
          Nova senha
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-indigo"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Confirmar senha
          <input
            type="password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-indigo"
          />
        </label>
        {error ? <p className="mt-4 rounded-xl bg-[#FDE8EF] px-3 py-2 text-sm text-[#9F1239]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 h-12 w-full rounded-xl bg-indigo text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? 'Salvando…' : 'Continuar'}
        </button>
      </form>
    </main>
  )
}
