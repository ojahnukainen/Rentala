import { useState } from 'react'
import { toInputValue, fromInputValue } from '../lib/dates'
import styles from './DatepickerComponent.module.css'

type QuickSelect = '2days' | '1week' | 'custom'

interface DatepickerComponentProps {
  pickupDate: Date
  returnDate: Date
  readOnly?: boolean
  onDatesChange?: (pickup: Date, returnDate: Date) => void
}

function CalendarIcon() {
  return (
    <svg
      className={styles.calendarIcon}
      viewBox="0 0 18 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 8H17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 1V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 1V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function noonToday(): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d
}

export default function DatepickerComponent({
  pickupDate,
  returnDate,
  readOnly = false,
  onDatesChange,
}: DatepickerComponentProps) {
  const [active, setActive] = useState<QuickSelect | null>(null)

  function handlePickupChange(value: string) {
    if (!value) return
    const newPickup = fromInputValue(value)
    // If return is now on or before pickup, push it forward by 1 day
    const newReturn = newPickup >= returnDate
      ? new Date(newPickup.getTime() + 86_400_000)
      : returnDate
    setActive(null)
    onDatesChange?.(newPickup, newReturn)
  }

  function handleReturnChange(value: string) {
    if (!value) return
    const newReturn = fromInputValue(value)
    setActive(null)
    onDatesChange?.(pickupDate, newReturn)
  }

  function applyQuickSelect(preset: QuickSelect) {
    setActive(preset)
    const pickup = new Date()
    pickup.setHours(12, 0, 0, 0)
    if (preset === '2days') {
      const ret = new Date(pickup)
      ret.setDate(ret.getDate() + 2)
      onDatesChange?.(pickup, ret)
    } else if (preset === '1week') {
      const ret = new Date(pickup)
      ret.setDate(ret.getDate() + 7)
      onDatesChange?.(pickup, ret)
    } else {
      // custom — keep current and let user pick via calendar fields
    }
  }

  const todayValue = toInputValue(noonToday())
  // Return min is the day after pickup
  const returnMin = toInputValue(new Date(pickupDate.getTime() + 86_400_000))

  return (
    <div className={styles.wrapper}>
      {!readOnly && <span className={styles.label}>Date for the rent</span>}
      <div className={styles.card}>
        <div className={styles.dateFields}>

          {/* Pickup Date */}
          <div className={styles.dateInput}>
            <CalendarIcon />
            <div className={styles.dateInputContent}>
              <span className={styles.dateInputHeader}>Pickup Date</span>
              <span className={styles.dateInputValue}>{formatDate(pickupDate)}</span>
            </div>
            {!readOnly && (
              <input
                type="date"
                className={styles.dateNativeInput}
                value={toInputValue(pickupDate)}
                min={todayValue}
                onChange={(e) => handlePickupChange(e.target.value)}
                aria-label="Pickup date"
              />
            )}
          </div>

          {/* Return Date */}
          <div className={styles.dateInput}>
            <CalendarIcon />
            <div className={styles.dateInputContent}>
              <span className={styles.dateInputHeader}>Return Date</span>
              <span className={styles.dateInputValue}>{formatDate(returnDate)}</span>
            </div>
            {!readOnly && (
              <input
                type="date"
                className={styles.dateNativeInput}
                value={toInputValue(returnDate)}
                min={returnMin}
                onChange={(e) => handleReturnChange(e.target.value)}
                aria-label="Return date"
              />
            )}
          </div>

        </div>

        {!readOnly && (
          <>
            <div className={styles.quickSelect}>
              <button
                type="button"
                className={`${styles.quickBtn} ${active === '2days' ? styles.quickBtnActive : ''}`}
                onClick={() => applyQuickSelect('2days')}
              >
                2 DAYS
              </button>
              <button
                type="button"
                className={`${styles.quickBtn} ${active === '1week' ? styles.quickBtnActive : ''}`}
                onClick={() => applyQuickSelect('1week')}
              >
                1 WEEK
              </button>
              <button
                type="button"
                className={`${styles.quickBtn} ${active === 'custom' ? styles.quickBtnActive : ''}`}
                onClick={() => applyQuickSelect('custom')}
              >
                CUSTOM
              </button>
            </div>

            <button type="button" className={styles.submitBtn}>
              Update Dates
            </button>
          </>
        )}
      </div>
    </div>
  )
}
