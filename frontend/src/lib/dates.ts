export function defaultPickup(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(12, 0, 0, 0) // noon — avoids midnight-UTC vs local-midnight timezone edge cases
  return d
}

export function defaultReturn(): Date {
  const d = defaultPickup()
  d.setDate(d.getDate() + 2)
  return d
}
