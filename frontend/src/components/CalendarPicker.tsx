import { useState, useRef, useEffect } from 'react'
import styles from './CalendarPicker.module.css'

interface CalendarPickerProps {
  initialPickup: Date
  initialReturn: Date
  onConfirm: (pickup: Date, returnDate: Date) => void
  onClose: () => void
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

function formatDisplay(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toNoon(date: Date): Date {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isPast(date: Date, today: Date): boolean {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  return d < t
}

/** Returns 0=Mon ... 6=Sun for the given date */
function weekday(date: Date): number {
  return (date.getDay() + 6) % 7
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function diffDays(start: Date, end: Date): number {
  const a = new Date(start)
  a.setHours(0, 0, 0, 0)
  const b = new Date(end)
  b.setHours(0, 0, 0, 0)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

type Picking = 'start' | 'end'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

interface MonthGridProps {
  year: number
  month: number
  today: Date
  start: Date | null
  end: Date | null
  onDayClick: (date: Date) => void
}

function MonthGrid({ year, month, today, start, end, onDayClick }: MonthGridProps) {
  const monthName = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' })
  const totalDays = daysInMonth(year, month)
  const firstDay = new Date(year, month, 1)
  const firstWeekday = weekday(firstDay)

  const cells: React.ReactNode[] = []

  // Empty cells before first day
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(<div key={`empty-${i}`} className={styles.dayCell} />)
  }

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d, 12, 0, 0, 0)
    const past = isPast(date, today)
    const isStart = start !== null && isSameDay(date, start)
    const isEnd = end !== null && isSameDay(date, end)
    const inRange =
      start !== null &&
      end !== null &&
      !isStart &&
      !isEnd &&
      date > start &&
      date < end

    let rangeBgClass: string | null = null
    if (isStart && end !== null) {
      rangeBgClass = styles.rangeStart
    } else if (isEnd && start !== null) {
      rangeBgClass = styles.rangeEnd
    } else if (inRange) {
      rangeBgClass = styles.rangeMiddle
    }

    let btnClass = styles.dayBtn
    if (isStart || isEnd) {
      btnClass = `${styles.dayBtn} ${styles.dayBtnSelected}`
    } else if (past) {
      btnClass = `${styles.dayBtn} ${styles.dayBtnPast}`
    }

    cells.push(
      <div
        key={d}
        className={styles.dayCell}
        style={d === 1 ? { gridColumn: firstWeekday + 1 } : undefined}
      >
        {rangeBgClass && <div className={`${styles.rangeBg} ${rangeBgClass}`} />}
        <button
          type="button"
          className={btnClass}
          disabled={past}
          onClick={() => !past && onDayClick(date)}
          aria-label={`${monthName} ${d}, ${year}`}
        >
          {d}
        </button>
      </div>,
    )
  }

  return (
    <div className={styles.monthBlock}>
      <div className={styles.monthTitle}>
        {monthName} {year}
      </div>
      <div className={styles.monthGrid}>{cells}</div>
    </div>
  )
}

export default function CalendarPicker({
  initialPickup,
  initialReturn,
  onConfirm,
  onClose,
}: CalendarPickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [start, setStart] = useState<Date | null>(toNoon(initialPickup))
  const [end, setEnd] = useState<Date | null>(toNoon(initialReturn))
  const [picking, setPicking] = useState<Picking>('start')

  const scrollRef = useRef<HTMLDivElement>(null)

  // Build list of months: current + 3 more
  const months: Array<{ year: number; month: number }> = []
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() })
  }

  function handleDayClick(date: Date) {
    if (picking === 'start') {
      setStart(date)
      setEnd(null)
      setPicking('end')
    } else {
      if (start !== null && date <= start) {
        // Restart from this day
        setStart(date)
        setEnd(null)
        setPicking('end')
      } else {
        setEnd(date)
        // stay in end mode; user can still change
      }
    }
  }

  function handleSummaryClick(field: Picking) {
    setPicking(field)
    if (field === 'start') {
      setEnd(null)
    }
  }

  function handleConfirm() {
    if (start && end) {
      onConfirm(toNoon(start), toNoon(end))
    }
  }

  const days = start && end ? diffDays(start, end) : 0
  const canConfirm = start !== null && end !== null

  // Prevent body scroll when open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Select dates">
      {/* Header */}
      <div className={styles.header}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close calendar"
        >
          ✕
        </button>
        <span className={styles.headerTitle}>Select Dates</span>
        <div className={styles.headerSpacer} />
      </div>

      {/* Summary bar */}
      <div className={styles.summaryBar}>
        <button
          type="button"
          className={`${styles.summaryField} ${picking === 'start' ? styles.summaryFieldActive : ''}`}
          onClick={() => handleSummaryClick('start')}
        >
          <CalendarIcon />
          <div className={styles.summaryFieldContent}>
            <span className={styles.summaryFieldLabel}>Pickup Date</span>
            <span className={styles.summaryFieldValue}>{formatDisplay(start)}</span>
          </div>
        </button>

        <span className={styles.summaryArrow}>→</span>

        <button
          type="button"
          className={`${styles.summaryField} ${picking === 'end' ? styles.summaryFieldActive : ''}`}
          onClick={() => handleSummaryClick('end')}
        >
          <CalendarIcon />
          <div className={styles.summaryFieldContent}>
            <span className={styles.summaryFieldLabel}>Return Date</span>
            <span className={styles.summaryFieldValue}>{formatDisplay(end)}</span>
          </div>
        </button>
      </div>

      {/* Weekday header row */}
      <div className={styles.weekdayHeader}>
        {WEEKDAYS.map((wd) => (
          <div key={wd} className={styles.weekdayCell}>
            {wd}
          </div>
        ))}
      </div>

      {/* Scrollable calendar area */}
      <div className={styles.scrollArea} ref={scrollRef}>
        {months.map(({ year, month }) => (
          <MonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            today={today}
            start={start}
            end={end}
            onDayClick={handleDayClick}
          />
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerCount}>
          <span className={styles.footerDays}>{days} Days</span>
          <span className={styles.footerSelected}> Selected</span>
        </div>
        <button
          type="button"
          className={styles.confirmBtn}
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          Confirm Dates →
        </button>
      </div>
    </div>
  )
}
