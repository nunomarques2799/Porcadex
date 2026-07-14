import { useState } from 'react'
import { LogIn, UserPlus, Mail, Lock } from 'lucide-react'
import { useAuth } from '../lib/auth'

type Mode = 'signin' | 'signup'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setInfo(null)
    if (!email.trim() || !password) {
      setErr('Preenche email e password.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password)
        if (error) setErr(error)
      } else {
        const { error, needsConfirmation } = await signUp(email.trim(), password)
        if (error) setErr(error)
        else if (needsConfirmation)
          setInfo('Conta criada. Confirma o email para entrares.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="logo-ball logo-ball--lg" aria-hidden="true" />
          <h1>Porcadex</h1>
          <p>A tua colecção pessoal — agora na cloud.</p>
        </div>

        <div className="segmented">
          <button
            className={'segmented__btn' + (mode === 'signin' ? ' is-active' : '')}
            onClick={() => setMode('signin')}
            type="button"
          >
            Entrar
          </button>
          <button
            className={'segmented__btn' + (mode === 'signup' ? ' is-active' : '')}
            onClick={() => setMode('signup')}
            type="button"
          >
            Criar conta
          </button>
        </div>

        <form className="auth__form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <div className="input-icon">
              <Mail size={16} />
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@exemplo.com"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <div className="input-icon">
              <Lock size={16} />
              <input
                id="pw"
                className="input"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••"
                minLength={6}
              />
            </div>
          </div>

          {err && <p className="auth__err">{err}</p>}
          {info && <p className="auth__info">{info}</p>}

          <button
            type="submit"
            className="btn btn--primary auth__submit"
            disabled={busy}
          >
            {mode === 'signin' ? (
              <>
                <LogIn size={17} /> Entrar
              </>
            ) : (
              <>
                <UserPlus size={17} /> Criar conta
              </>
            )}
          </button>
        </form>

        <p className="auth__hint">
          Cada conta tem a sua própria Porcadex — os teus amigos não vêem a tua.
        </p>
      </div>
    </div>
  )
}

/** Fallback shown when the app was built without Supabase env vars. */
export function SetupScreen() {
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="logo-ball logo-ball--lg" aria-hidden="true" />
          <h1>Porcadex</h1>
        </div>
        <h2 style={{ margin: 0 }}>Configuração pendente</h2>
        <p className="auth__hint">
          O backend (Supabase) ainda não está ligado. Define as variáveis
          <code> VITE_SUPABASE_URL </code> e
          <code> VITE_SUPABASE_ANON_KEY </code>
          antes de fazer o build.
        </p>
      </div>
    </div>
  )
}
