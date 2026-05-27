import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useCheckoutStore } from '../store/useCheckoutStore'
import { useAuthStore } from '../store/useAuthStore'
import { api, ApiError } from '../lib/api'
import DatepickerComponent from '../components/DatepickerComponent'
import GearListItem from '../components/GearListItem'
import styles from './checkout.module.css'

export const Route = createFileRoute('/checkout')({
  beforeLoad: () => {
    const { user, loading } = useAuthStore.getState()
    if (!loading && !user) {
      throw redirect({ to: '/login', search: { redirect: '/checkout' } })
    }
  },
  component: CheckoutPage,
})

function CheckoutPage() {
  const { items, pickupDate, returnDate, removeItem, clear } = useCheckoutStore()
  const { user, loading: authLoading } = useAuthStore()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Guard for the case where auth finishes loading and user is still null
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login', search: { redirect: '/checkout' } })
    }
  }, [authLoading, user, navigate])

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  async function handleCheckout() {
    setSubmitError(null)
    setSubmitting(true)
    try {
      await api.post('/api/v1/loans', {
        gearIds: items.map((i) => i.id),
        startDate: pickupDate,
        dueDate: returnDate,
      })
      clear()
      navigate({ to: '/booking-result', search: { status: 'confirmed' } })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(message)
      navigate({ to: '/booking-result', search: { status: 'denied' } })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Checkout</h1>
        <h2 className={styles.heroSubtitle}>Almost ready to rock n&apos; roll</h2>
      </div>

      <div className={styles.summarySection}>
        <p className={styles.sectionLabel}>Summary for the booking</p>
        <DatepickerComponent pickupDate={pickupDate} returnDate={returnDate} readOnly />
      </div>

      <div className={styles.gearSection}>
        <p className={styles.sectionLabel}>Selected gear</p>

        {items.length === 0 ? (
          <p className={styles.empty}>
            No items selected.{' '}
            <button
              type="button"
              onClick={() => navigate({ to: '/gear' })}
              style={{ background: 'none', border: 'none', color: '#416900', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Go back to gear
            </button>
          </p>
        ) : (
          Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category} className={styles.categorySection}>
              <p className={styles.categoryLabel}>{category}</p>
              <div className={styles.itemList}>
                {categoryItems.map((item) => (
                  <GearListItem
                    key={item.id}
                    name={item.name}
                    brand={item.brand}
                    added
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {submitError && <p className={styles.error}>{submitError}</p>}
      </div>

      {items.length > 0 && (
        <div className={styles.checkoutBar}>
          <button
            type="button"
            className={styles.checkoutBtn}
            onClick={handleCheckout}
            disabled={submitting}
          >
            {submitting ? 'Booking…' : 'Checkout'}
          </button>
        </div>
      )}
    </div>
  )
}
