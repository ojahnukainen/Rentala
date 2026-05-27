import { create } from 'zustand'
import { api, ApiError } from '../lib/api'

export interface AuthUser {
  id: string
  name: string
  email: string
}

interface AuthStore {
  user: AuthUser | null
  loading: boolean
  error: string | null
  fetchSession: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: null,

  fetchSession: async () => {
    set({ loading: true, error: null })
    try {
      const data = await api.get<{ user: AuthUser | null }>('/api/auth/get-session')
      set({ user: data?.user ?? null })
    } catch {
      set({ user: null })
    } finally {
      set({ loading: false })
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const data = await api.post<{ user: AuthUser }>('/api/auth/sign-in/email', {
        email,
        password,
      })
      set({ user: data.user })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sign in failed'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email, password, name) => {
    set({ loading: true, error: null })
    try {
      const data = await api.post<{ user: AuthUser }>('/api/auth/sign-up/email', {
        email,
        password,
        name,
      })
      set({ user: data.user })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sign up failed'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    set({ loading: true, error: null })
    try {
      await api.post('/api/auth/sign-out')
    } finally {
      set({ user: null, loading: false })
    }
  },
}))
