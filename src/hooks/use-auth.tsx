import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  isAuthenticated: boolean
  isAdmin: boolean
  isDoctor: boolean
  isSecretary: boolean
  tenantId: string | null
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (!session?.user) {
        setProfile(null)
        setLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (!session?.user) {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let isMounted = true

    if (user) {
      setLoading(true)
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (isMounted) {
            if (data) setProfile(data)
            setLoading(false)
          }
        })
    } else {
      if (isMounted) {
        setProfile(null)
      }
    }

    return () => {
      isMounted = false
    }
  }, [user])

  const signInWithEmail = async (email: string, password: string) => {
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      let msg = 'Erro ao entrar. Tente novamente.'
      if (authError.message.includes('Invalid login credentials')) msg = 'Email ou senha incorretos'
      if (authError.message.includes('Email not confirmed'))
        msg = 'Confirme seu email antes de entrar'
      setError(msg)
      return { error: msg }
    }
    return { error: null }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    setError(null)
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (authError) {
      let msg = 'Erro ao criar conta. Tente novamente.'
      if (authError.message.includes('User already registered'))
        msg = 'Este email ja esta cadastrado'
      if (authError.message.includes('Password should be at least'))
        msg = 'A senha deve ter pelo menos 6 caracteres'
      setError(msg)
      return { error: msg }
    }
    return { error: null }
  }

  const signInWithGoogle = async () => {
    setError(null)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (authError) {
      const msg = 'Erro ao entrar com Google. Tente novamente.'
      setError(msg)
      return { error: msg }
    }
    return { error: null }
  }

  const signOut = async () => {
    setError(null)
    const { error: authError } = await supabase.auth.signOut()
    if (authError) {
      const msg = 'Erro ao sair. Tente novamente.'
      setError(msg)
      return { error: msg }
    }
    setUser(null)
    setProfile(null)
    return { error: null }
  }

  const resetPassword = async (email: string) => {
    setError(null)
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (authError) {
      const msg = 'Erro ao redefinir senha. Tente novamente.'
      setError(msg)
      return { error: msg }
    }
    return { error: null }
  }

  return {
    user,
    profile,
    session,
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'super_admin',
    isDoctor: profile?.role === 'doctor',
    isSecretary: profile?.role === 'secretary',
    tenantId: profile?.tenant_id || null,
  }
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuthContext must be used within an AuthProvider')
  return context
}
