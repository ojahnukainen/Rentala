import { useState } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useAuthStore } from '../store/useAuthStore'
import styles from './login.module.css'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string | undefined) ?? '/gear',
  }),
  component: LoginPage,
})

type Mode = 'signin' | 'signup'

function LoginPage() {
  const { redirect } = useSearch({ from: '/login' })
  const navigate = useNavigate()
  const { signIn, signUp, loading, error } = useAuthStore()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password, name)
      }
      navigate({ to: redirect })
    } catch {
      // error is already in store
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setEmail('')
    setPassword('')
    setName('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>{mode === 'signin' ? 'Welcome back' : 'Get started'}</h1>
        <h2 className={styles.heroSubtitle}>
          {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
        </h2>
      </div>

      <div className={styles.card}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'signin' ? styles.tabActive : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          {mode === 'signup' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                className={styles.input}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
