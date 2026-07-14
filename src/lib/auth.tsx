import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseReady } from './supabase'

interface AuthContextValue {
  ready: boolean // Supabase configured
  loading: boolean // still restoring session
  session: Session | null
  user: User | null
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(supabaseReady)

  useEffect(() => {
    if (!supabase) return
    // Restore existing session on mount.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase não configurado' }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    // If email confirmation is on, `session` is null even after signUp.
    return { needsConfirmation: !data.session }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase não configurado' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return {}
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready: supabaseReady,
      loading,
      session,
      user: session?.user ?? null,
      signUp,
      signIn,
      signOut,
    }),
    [loading, session, signUp, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
