import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCheckoutStore } from '../store/useCheckoutStore'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const { items, removeItem } = useCheckoutStore()
  const navigate = useNavigate()

  return (
    <main style={{ padding: '24px' }}>
      <button type="button" onClick={() => navigate({ to: '/gear' })} style={{ marginBottom: '16px' }}>
        ← Back to gear
      </button>

      <h1>Checkout preview</h1>
      <p>Items in cart: {items.length}</p>

      {items.length === 0 ? (
        <p>No items selected.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong> — {item.brand}{' '}
              <button type="button" onClick={() => removeItem(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
