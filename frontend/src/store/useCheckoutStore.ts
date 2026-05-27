import { create } from 'zustand'

export interface CheckoutItem {
  id: string
  name: string
  brand: string
}

interface CheckoutStore {
  items: CheckoutItem[]
  addItem: (item: CheckoutItem) => void
  removeItem: (id: string) => void
  hasItem: (id: string) => boolean
  clear: () => void
}

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      if (state.items.some((i) => i.id === item.id)) return state
      return { items: [...state.items, item] }
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  hasItem: (id) => get().items.some((i) => i.id === id),

  clear: () => set({ items: [] }),
}))
