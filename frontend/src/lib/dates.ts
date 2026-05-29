/** Today at noon local time — safe default for display and availability queries. */
export function defaultPickup(): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d
}

/** Two days from today at noon. */
export function defaultReturn(): Date {
  const d = defaultPickup()
  d.setDate(d.getDate() + 2)
  return d
}

/** Format a Date as YYYY-MM-DD for <input type="date"> value prop. */
export function toInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse a YYYY-MM-DD string from a date input into a local-noon Date. */
export function fromInputValue(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date()
  date.setFullYear(y, m - 1, d)
  date.setHours(12, 0, 0, 0)
  return date
}
