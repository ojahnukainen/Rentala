import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/useAuthStore'
import { useCheckoutStore } from '../store/useCheckoutStore'
import { api } from '../lib/api'
import { isCompleted, getLoanStatus } from '../lib/loanStatus'
import { defaultPickup, defaultReturn } from '../lib/dates'
import type { LoanWithItems } from '../lib/types'
import DatepickerComponent from '../components/DatepickerComponent'
import DashboardRentedDeviceCard from '../components/DashboardRentedDeviceCard'
import styles from './dashboard.module.css'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user, loading: authLoading } = useAuthStore()
  const { pickupDate, returnDate, setDates } = useCheckoutStore()
  const navigate = useNavigate()

  const [loans, setLoans] = useState<LoanWithItems[]>([])
  const [loansLoading, setLoansLoading] = useState(false)

  const fetchLoans = useCallback(async () => {
    if (!user) return
    setLoansLoading(true)
    try {
      const data = await api.get<LoanWithItems[]>(`/api/v1/users/${user.id}/loans`)
      setLoans(data.filter((l) => !isCompleted(l)))
    } catch {
      setLoans([])
    } finally {
      setLoansLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  function handleDatesChange(pickup: Date, ret: Date) {
    setDates(pickup, ret)
  }

  // Split loans into current (active) and upcoming (ready-to-pickup + upcoming)
  const currentLoans = loans.filter((l) => getLoanStatus(l) === 'active')
  const upcomingLoans = loans.filter((l) => getLoanStatus(l) !== 'active')

  const pickup = pickupDate ?? defaultPickup()
  const ret = returnDate ?? defaultReturn()

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>
          {user ? `Hello ${user.name.split(' ')[0]}!` : 'Hello!'}
        </h1>
        <h2 className={styles.heroSubtitle}>Good day to take photos</h2>
      </div>

      <div className={styles.bookingSection}>
        <p className={styles.sectionLabel}>New booking</p>
        <DatepickerComponent
          pickupDate={pickup}
          returnDate={ret}
          onDatesChange={handleDatesChange}
        />
        <button type="button" className={styles.browseBtn} onClick={() => navigate({ to: '/gear' })}>
          See available devices
        </button>
      </div>

      <div className={styles.loansSection}>
        <p className={styles.sectionLabel}>Current and upcoming rents</p>

        {authLoading && <p className={styles.stateMsg}>Loading…</p>}

        {!authLoading && !user && (
          <p className={styles.loginMsg}>
            <button
              type="button"
              className={styles.loginLink}
              onClick={() => navigate({ to: '/login', search: { redirect: '/dashboard' } })}
            >
              Please log in
            </button>
            {' '}to see your rents.
          </p>
        )}

        {!authLoading && user && loansLoading && (
          <p className={styles.stateMsg}>Loading your rents…</p>
        )}

        {!authLoading && user && !loansLoading && loans.length === 0 && (
          <p className={styles.stateMsg}>No upcoming rents.</p>
        )}

        {!authLoading && user && !loansLoading && currentLoans.length > 0 && (
          <div className={styles.cardList}>
            {currentLoans.map((loan) => (
              <DashboardRentedDeviceCard key={loan.id} loan={loan} onRefresh={fetchLoans} />
            ))}
          </div>
        )}

        {!authLoading && user && !loansLoading && upcomingLoans.length > 0 && (
          <>
            <p className={styles.subSectionLabel}>Upcoming rents</p>
            <div className={styles.cardList}>
              {upcomingLoans.map((loan) => (
                <DashboardRentedDeviceCard key={loan.id} loan={loan} onRefresh={fetchLoans} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
