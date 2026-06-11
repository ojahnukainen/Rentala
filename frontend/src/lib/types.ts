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

export interface LoanItem {
  id: string
  loanId: string
  gearId: string
  status: 'RESERVED' | 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST'
  returnedAt: string | null
  gear: Gear
}

export interface LoanWithItems extends Loan {
  items: LoanItem[]
}

export interface User {
  id: string
  email: string
  name: string
  role: 'MEMBER' | 'ADMIN'
  createdAt: string
  updatedAt: string
}
