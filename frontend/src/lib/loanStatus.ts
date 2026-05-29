import type { LoanWithItems } from './types'

export type LoanStatus = 'active' | 'ready-to-pickup' | 'upcoming'

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function getLoanStatus(loan: LoanWithItems): LoanStatus {
  if (loan.borrowedAt !== null) return 'active'
  const start = new Date(loan.startDate)
  const today = new Date()
  if (isSameDay(start, today)) return 'ready-to-pickup'
  return 'upcoming'
}

export function isCompleted(loan: LoanWithItems): boolean {
  return loan.items.length > 0 && loan.items.every((i) => i.status === 'RETURNED')
}

export function formatDateRange(startDate: string, dueDate: string): string {
  const start = new Date(startDate)
  const end = new Date(dueDate)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${startStr} - ${endStr}`
}
