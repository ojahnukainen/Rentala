import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { LoanStatsResponse } from '@rentala_project/shared'
import { useAuthStore } from '../store/useAuthStore'
import { api } from '../lib/api'
import type { User } from '../lib/types'
import AdminStatCard from '../components/AdminStatCard'
import AdminUserListItem from '../components/AdminUserListItem'
import styles from './admin.module.css'

const PAGE_SIZE = 10

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const { user, loading: authLoading } = useAuthStore()
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>([])
  const [activeLoans, setActiveLoans] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      api.get<User[]>('/api/v1/users'),
      api.get<LoanStatsResponse>('/api/v1/loans/stats'),
    ]).then(([usersRes, statsRes]) => {
      if (cancelled) return
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value)
      else setUsers([])
      if (statsRes.status === 'fulfilled') setActiveLoans(statsRes.value.activeLoans)
      else setActiveLoans(null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const totalUsers = users.length
  const visibleUsers = users.slice(0, visibleCount)
  const hasMore = visibleCount < totalUsers

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.iconButton} aria-hidden>☰</span>
          <h1 className={styles.title}>Rentala Admin</h1>
        </div>
        <span className={styles.iconButton} aria-hidden>🔔</span>
      </header>

      <main className={styles.main}>
        <div className={styles.statsGrid}>
          <AdminStatCard label="Total Users" value={totalUsers.toLocaleString()} />
          <AdminStatCard
            label="Active Rents"
            value={activeLoans ?? '—'}
            showDot
          />
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={() => navigate({ to: '/admin/gear/new' })}
        >
          <span aria-hidden>＋</span>
          ADD New item
        </button>

        <div className={styles.searchBlock}>
          <div className={styles.searchInputWrap}>
            <span className={styles.searchIcon} aria-hidden>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Search directory..."
              disabled
            />
          </div>
          <div className={styles.filterRow}>
            <button type="button" className={`${styles.chip} ${styles.chipPrimary}`} disabled>
              All Roles ▾
            </button>
            <button type="button" className={styles.chip} disabled>
              Status: Active
            </button>
          </div>
        </div>

        {authLoading && <p className={styles.stateMsg}>Loading…</p>}

        {!authLoading && !user && (
          <p className={styles.stateMsg}>
            <button
              type="button"
              className={styles.loadMore}
              onClick={() => navigate({ to: '/login', search: { redirect: '/admin' } })}
            >
              Please log in
            </button>
            {' '}to see the directory.
          </p>
        )}

        {!authLoading && user && loading && (
          <p className={styles.stateMsg}>Loading directory…</p>
        )}

        {!authLoading && user && !loading && totalUsers === 0 && (
          <p className={styles.stateMsg}>No users yet.</p>
        )}

        {!authLoading && user && !loading && totalUsers > 0 && (
          <>
            <div className={styles.userList}>
              {visibleUsers.map((u) => (
                <AdminUserListItem key={u.id} user={u} />
              ))}
            </div>
            <div className={styles.pagination}>
              <p className={styles.pageStatus}>
                Showing {visibleUsers.length} of {totalUsers.toLocaleString()} users
              </p>
              {hasMore && (
                <button
                  type="button"
                  className={styles.loadMore}
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  Load more accounts ▾
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
