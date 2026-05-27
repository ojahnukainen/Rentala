import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import DatepickerComponent from '../components/DatepickerComponent'
import GearListItem from '../components/GearListItem'
import { useCheckoutStore } from '../store/useCheckoutStore'
import styles from './gear.module.css'

export const Route = createFileRoute('/gear')({
  component: GearListPage,
})

// Placeholder data — will be replaced with API calls
const CAMERAS = [
  { id: '1', name: 'R6 #1', brand: 'Canon' },
  { id: '2', name: 'R6 #2', brand: 'Canon' },
  { id: '3', name: 'R #1', brand: 'Canon' },
  { id: '4', name: 'R7 #1', brand: 'Canon' },
]

function defaultPickup() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function defaultReturn() {
  const d = defaultPickup()
  d.setDate(d.getDate() + 2)
  return d
}

function GearListPage() {
  const [pickupDate, setPickupDate] = useState(defaultPickup)
  const [returnDate, setReturnDate] = useState(defaultReturn)
  const { items, addItem, removeItem, hasItem } = useCheckoutStore()
  const navigate = useNavigate()

  function handleDatesChange(pickup: Date, ret: Date) {
    setPickupDate(pickup)
    setReturnDate(ret)
  }

  function handleCheckout() {
    navigate({ to: '/checkout' })
  }

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

        <div className={styles.categorySection}>
          <p className={styles.categoryLabel}>Cameras</p>
          <div className={styles.itemList}>
            {CAMERAS.map((item) => (
              <GearListItem
                key={item.id}
                name={item.name}
                brand={item.brand}
                added={hasItem(item.id)}
                onInfo={() => console.log('info', item.id)}
                onAdd={() => addItem(item)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {count > 0 && (
        <div className={styles.checkoutBar}>
          <button type="button" className={styles.checkoutBtn} onClick={handleCheckout}>
            To checkout ({count})
          </button>
        </div>
      )}
    </div>
  )
}
