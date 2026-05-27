import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCheckoutStore } from '../store/useCheckoutStore'
import DatepickerComponent from '../components/DatepickerComponent'
import GearListItem from '../components/GearListItem'
import styles from './checkout.module.css'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const { items, pickupDate, returnDate, removeItem } = useCheckoutStore()
  const navigate = useNavigate()

  // Group items by category
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.category
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Checkout</h1>
        <h2 className={styles.heroSubtitle}>Almost ready to rock n&apos; roll</h2>
      </div>

      <div className={styles.summarySection}>
        <p className={styles.sectionLabel}>Summary for the booking</p>
        <DatepickerComponent
          pickupDate={pickupDate}
          returnDate={returnDate}
          readOnly
        />
      </div>

      <div className={styles.gearSection}>
        <p className={styles.sectionLabel}>Selected gear</p>

        {items.length === 0 ? (
          <p className={styles.empty}>No items selected. <button type="button" onClick={() => navigate({ to: '/gear' })} style={{ background: 'none', border: 'none', color: '#416900', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Go back to gear</button></p>
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
      </div>

      {items.length > 0 && (
        <div className={styles.checkoutBar}>
          <button
            type="button"
            className={styles.checkoutBtn}
            onClick={() => navigate({ to: '/booking-result', search: { status: 'confirmed' } })}
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  )
}
