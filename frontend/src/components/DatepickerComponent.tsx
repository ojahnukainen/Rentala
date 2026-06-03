import { useState } from 'react'
import { toInputValue, fromInputValue } from '../lib/dates'
import styles from './DatepickerComponent.module.css'
import CalendarPicker from './CalendarPicker'

type QuickSelect = '2days' | '1week'

interface DatepickerComponentProps {
  pickupDate: Date
  returnDate: Date
  readOnly?: boolean
  onDatesChange?: (pickup: Date, returnDate: Date) => void
  onSubmit?: () => void
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
  onSubmit,
}: DatepickerComponentProps) {
  const [active, setActive] = useState<QuickSelect | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  function handlePickupChange(value: string) {
    if (!value) return
    const newPickup = fromInputValue(value)
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
    setCalendarOpen(false)
    const pickup = new Date()
    pickup.setHours(12, 0, 0, 0)
    const ret = new Date(pickup)
    ret.setDate(ret.getDate() + (preset === '2days' ? 2 : 7))
    onDatesChange?.(pickup, ret)
  }

  function handleCalendarConfirm(pickup: Date, ret: Date) {
    setActive(null)
    setCalendarOpen(false)
    onDatesChange?.(pickup, ret)
  }

  const todayValue = toInputValue(noonToday())
  const returnMin = toInputValue(new Date(pickupDate.getTime() + 86_400_000))

  return (
    <>
      <div className={styles.card}>
        <div className={styles.dateFields}>

          {/* Pickup Date */}
          <div
            className={styles.dateInput}
            onClick={!readOnly ? () => setCalendarOpen(true) : undefined}
            role={!readOnly ? 'button' : undefined}
            tabIndex={!readOnly ? 0 : undefined}
            onKeyDown={!readOnly ? (e) => { if (e.key === 'Enter' || e.key === ' ') setCalendarOpen(true) } : undefined}
            aria-label={!readOnly ? 'Open calendar to select pickup date' : undefined}
          >
            <CalendarIcon />
            <div className={styles.dateInputContent}>
              <span className={styles.dateInputHeader}>Pickup Date</span>
              <span className={styles.dateInputValue}>{formatDate(pickupDate)}</span>
            </div>
            {/* Legacy hidden native input kept only for readOnly mode display parity — not used in interactive mode */}
            {readOnly && (
              <input
                type="date"
                className={styles.dateNativeInput}
                value={toInputValue(pickupDate)}
                min={todayValue}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => handlePickupChange(e.target.value)}
              />
            )}
          </div>

          {/* Return Date */}
          <div
            className={styles.dateInput}
            onClick={!readOnly ? () => setCalendarOpen(true) : undefined}
            role={!readOnly ? 'button' : undefined}
            tabIndex={!readOnly ? 0 : undefined}
            onKeyDown={!readOnly ? (e) => { if (e.key === 'Enter' || e.key === ' ') setCalendarOpen(true) } : undefined}
            aria-label={!readOnly ? 'Open calendar to select return date' : undefined}
          >
            <CalendarIcon />
            <div className={styles.dateInputContent}>
              <span className={styles.dateInputHeader}>Return Date</span>
              <span className={styles.dateInputValue}>{formatDate(returnDate)}</span>
            </div>
            {readOnly && (
              <input
                type="date"
                className={styles.dateNativeInput}
                value={toInputValue(returnDate)}
                min={returnMin}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => handleReturnChange(e.target.value)}
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
            </div>

            {onSubmit && (
              <button type="button" className={styles.submitBtn} onClick={onSubmit}>
                See available devices
              </button>
            )}
          </>
        )}
      </div>

      {calendarOpen && !readOnly && (
        <CalendarPicker
          initialPickup={pickupDate}
          initialReturn={returnDate}
          onConfirm={handleCalendarConfirm}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </>
  )
}
