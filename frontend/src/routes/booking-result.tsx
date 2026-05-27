import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCheckoutStore } from '../store/useCheckoutStore'
import styles from './booking-result.module.css'

export const Route = createFileRoute('/booking-result')({
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search.status as 'confirmed' | 'denied') ?? 'confirmed',
  }),
  component: BookingResultPage,
})

function CheckIcon() {
  return (
    <svg className={styles.iconConfirmed} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="18" cy="18" r="17" stroke="currentColor" strokeWidth="2" />
      <path d="M10 18L15.5 23.5L26 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg className={styles.iconDenied} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="18" cy="18" r="17" stroke="currentColor" strokeWidth="2" />
      <path d="M12 12L24 24M24 12L12 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function BookingResultPage() {
  const { status } = Route.useSearch()
  const navigate = useNavigate()
  const clear = useCheckoutStore((s) => s.clear)
  const confirmed = status === 'confirmed'

  function handleDashboard() {
    clear()
    navigate({ to: '/dashboard' })
  }

  function handleRetry() {
    navigate({ to: '/gear' })
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.iconWrap} ${confirmed ? styles.iconWrapConfirmed : styles.iconWrapDenied}`}>
        {confirmed ? <CheckIcon /> : <CrossIcon />}
      </div>

      <h1 className={styles.title}>
        {confirmed ? 'Booking Confirmed!' : 'Booking Denied'}
      </h1>
      <p className={styles.subtitle}>
        {confirmed
          ? 'Your gear is reserved. Head to the dashboard to see your loan details.'
          : 'Something went wrong with your booking. Please try again or contact support.'}
      </p>

      <button
        type="button"
        className={`${styles.btn} ${confirmed ? styles.btnConfirmed : styles.btnDenied}`}
        onClick={confirmed ? handleDashboard : handleRetry}
      >
        {confirmed ? 'Go to Dashboard' : 'Try Again'}
      </button>
    </div>
  )
}
