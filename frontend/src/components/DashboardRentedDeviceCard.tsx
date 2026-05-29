import { useState } from 'react'
import { api, ApiError } from '../lib/api'
import { getLoanStatus, formatDateRange } from '../lib/loanStatus'
import type { LoanWithItems } from '../lib/types'
import styles from './DashboardRentedDeviceCard.module.css'

interface Props {
  loan: LoanWithItems
  onRefresh: () => void
}

const STATUS_LABELS = {
  'active': 'Active',
  'ready-to-pickup': 'Ready to pick up',
  'upcoming': 'Upcoming',
} as const

export default function DashboardRentedDeviceCard({ loan, onRefresh }: Props) {
  const [loading, setLoading] = useState(false)
  const status = getLoanStatus(loan)
  const activeItemIds = loan.items.filter((i) => i.status === 'ACTIVE').map((i) => i.id)

  async function handlePickup() {
    setLoading(true)
    try {
      await api.post(`/api/v1/loans/${loan.id}/pickup`)
      onRefresh()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Pickup failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleReturn() {
    setLoading(true)
    try {
      await api.post('/api/v1/loans/returns', { loanItemIds: activeItemIds })
      onRefresh()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Return failed')
    } finally {
      setLoading(false)
    }
  }

  function ActionButton() {
    if (status === 'active') {
      return (
        <button
          type="button"
          className={`${styles.btnAction} ${styles.btnReturn}`}
          onClick={handleReturn}
          disabled={loading}
        >
          Return
        </button>
      )
    }
    if (status === 'ready-to-pickup') {
      return (
        <button
          type="button"
          className={`${styles.btnAction} ${styles.btnPickupActive}`}
          onClick={handlePickup}
          disabled={loading}
        >
          Pickup
        </button>
      )
    }
    return (
      <button
        type="button"
        className={`${styles.btnAction} ${styles.btnPickupDisabled}`}
        disabled
      >
        Pickup
      </button>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <span className={styles.dateRange}>
          {formatDateRange(loan.startDate, loan.dueDate)}
        </span>
        <span className={styles.deviceCount}>
          {loan.items.length} {loan.items.length === 1 ? 'device' : 'devices'}
        </span>
        <div className={styles.statusBadge}>
          <div className={styles.statusDot} />
          <span className={styles.statusLabel}>{STATUS_LABELS[status]}</span>
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button type="button" className={styles.btnInfo}>
          Info
        </button>
        <ActionButton />
      </div>
    </div>
  )
}
