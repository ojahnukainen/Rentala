import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/useAuthStore'
import styles from './profile.module.css'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user, loading, signOut } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/login', search: { redirect: '/profile' } })
    }
  }, [loading, user, navigate])

  async function handleSignOut() {
    await signOut()
    navigate({ to: '/login' })
  }

  if (!user) return null

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Profile</h1>
        <h2 className={styles.heroSubtitle}>Your account details</h2>
      </div>

      <div className={styles.card}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Name</span>
          <span className={styles.fieldValue}>{user.name}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Email</span>
          <span className={styles.fieldValue}>{user.email}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.signOutBtn} onClick={handleSignOut} disabled={loading}>
          {loading ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
