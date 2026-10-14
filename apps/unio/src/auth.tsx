import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

export type Account = {
  uid: string
  email: string
  name: string
  role: 'admin' | 'conductor'
  congregationId: string | null
  mustChangePassword: boolean
  manageFlags: string[]
}

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User; account: Account }

const AuthContext = createContext<{
  state: AuthState
  reload: () => Promise<void>
}>({
  state: { status: 'loading' },
  reload: async () => {},
})

async function accountFor(user: User): Promise<Account> {
  const snapshot = await getDoc(doc(db, 'users', user.uid))
  const data = snapshot.data()
  return {
    uid: user.uid,
    email: user.email ?? '',
    name: typeof data?.name === 'string' && data.name ? data.name : user.displayName || 'Conta',
    role: data?.role === 'admin' ? 'admin' : 'conductor',
    congregationId: typeof data?.congregationId === 'string' ? data.congregationId : null,
    mustChangePassword: data?.mustChangePassword === true,
    manageFlags: stringList(data?.manageFlags),
  }
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  async function reload() {
    const user = auth.currentUser
    if (!user) {
      setState({ status: 'signedOut' })
      return
    }
    setState({ status: 'signedIn', user, account: await accountFor(user) })
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setState({ status: 'signedOut' })
        return
      }
      void accountFor(user).then((account) => setState({ status: 'signedIn', user, account }))
    })
  }, [])

  return <AuthContext.Provider value={{ state, reload }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext).state
}

export function useReloadAccount() {
  return useContext(AuthContext).reload
}

export function useAccount() {
  const state = useAuth()
  return state.status === 'signedIn' ? state.account : null
}
