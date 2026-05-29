import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import DatepickerComponent from '../components/DatepickerComponent'
import GearListItem from '../components/GearListItem'
import { useCheckoutStore } from '../store/useCheckoutStore'
import { api } from '../lib/api'
import type { Gear } from '../lib/types'
import { defaultPickup, defaultReturn } from '../lib/dates'
import styles from './gear.module.css'

export const Route = createFileRoute('/gear')({
  component: GearListPage,
})

function GearListPage() {
  const [pickupDate, setPickupDate] = useState(defaultPickup)
  const [returnDate, setReturnDate] = useState(defaultReturn)
  const [gear, setGear] = useState<Gear[]>([])
  const [loadingGear, setLoadingGear] = useState(true)
  const [gearError, setGearError] = useState<string | null>(null)

  const { items, addItem, removeItem, hasItem, setDates } = useCheckoutStore()
  const navigate = useNavigate()

  useEffect(() => {
    setLoadingGear(true)
    setGearError(null)
    const params = new URLSearchParams({
      startDate: pickupDate.toISOString(),
      dueDate: returnDate.toISOString(),
    })
    api.get<Gear[]>(`/api/v1/gear?${params}`)
      .then(setGear)
      .catch(() => setGearError('Failed to load gear. Is the backend running?'))
      .finally(() => setLoadingGear(false))
  }, [pickupDate, returnDate])

  function handleDatesChange(pickup: Date, ret: Date) {
    setPickupDate(pickup)
    setReturnDate(ret)
    setDates(pickup, ret)
  }

  // Group available gear by category
  const grouped = gear
    .reduce<Record<string, Gear[]>>((acc, g) => {
      if (!acc[g.category]) acc[g.category] = []
      acc[g.category].push(g)
      return acc
    }, {})

  const count = items.length

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Booking Gear</h1>
        <h2 className={styles.heroSubtitle}>Everything you need is here</h2>
      </div>

      <div className={styles.datepickerSection}>
        <DatepickerComponent
          pickupDate={pickupDate}
          returnDate={returnDate}
          onDatesChange={handleDatesChange}
        />
      </div>

      <div className={styles.gearSection}>
        <p className={styles.sectionLabel}>Available Gear</p>

        {loadingGear && <p className={styles.stateMsg}>Loading gear…</p>}
        {gearError && <p className={styles.stateMsgError}>{gearError}</p>}

        {!loadingGear && !gearError && Object.entries(grouped).map(([category, items]) => (
          <div key={category} className={styles.categorySection}>
            <p className={styles.categoryLabel}>{category}</p>
            <div className={styles.itemList}>
              {items.map((g) => (
                <GearListItem
                  key={g.id}
                  name={g.name}
                  brand={g.category}
                  added={hasItem(g.id)}
                  onInfo={() => console.log('info', g.id)}
                  onAdd={() => addItem({ id: g.id, name: g.name, brand: g.category, category: g.category })}
                  onRemove={() => removeItem(g.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {!loadingGear && !gearError && Object.keys(grouped).length === 0 && (
          <p className={styles.stateMsg}>No gear available right now.</p>
        )}
      </div>

      {count > 0 && (
        <div className={styles.checkoutBar}>
          <button
            type="button"
            className={styles.checkoutBtn}
            onClick={() => navigate({ to: '/checkout' })}
          >
            To checkout ({count})
          </button>
        </div>
      )}
    </div>
  )
}
