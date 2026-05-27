import { create } from 'zustand'

export interface CheckoutItem {
  id: string
  name: string
  brand: string
  category: string
}

interface CheckoutStore {
  items: CheckoutItem[]
  pickupDate: Date
  returnDate: Date
  addItem: (item: CheckoutItem) => void
  removeItem: (id: string) => void
  hasItem: (id: string) => boolean
  setDates: (pickup: Date, ret: Date) => void
  clear: () => void
}

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

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  items: [],
  pickupDate: defaultPickup(),
  returnDate: defaultReturn(),

  addItem: (item) =>
    set((state) => {
      if (state.items.some((i) => i.id === item.id)) return state
      return { items: [...state.items, item] }
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  hasItem: (id) => get().items.some((i) => i.id === id),

  setDates: (pickup, ret) => set({ pickupDate: pickup, returnDate: ret }),

  clear: () => set({ items: [] }),
}))
