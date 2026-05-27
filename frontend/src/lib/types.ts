export interface Gear {
  id: string
  name: string
  serialNumber: string
  category: string
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'LOST'
  createdAt: string
  updatedAt: string
}

export interface Loan {
  id: string
  userId: string
  startDate: string
  borrowedAt: string | null
  dueDate: string
  createdAt: string
  updatedAt: string
}
