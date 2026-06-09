import { create } from 'zustand'
import type { User, UserRole } from '@/types'
import { api } from '@/utils/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  role: UserRole | null
  login: (phone: string, code: string, role: UserRole) => Promise<void>
  loginWithPassword: (username: string, password: string, role: UserRole) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  role: (localStorage.getItem('role') as UserRole) || null,

  login: async (phone, code, role) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { phone, code, role })
    localStorage.setItem('token', res.token)
    localStorage.setItem('role', res.user.role)
    set({ token: res.token, user: res.user, isAuthenticated: true, role: res.user.role })
  },

  loginWithPassword: async (username, password, role) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { username, password, role })
    localStorage.setItem('token', res.token)
    localStorage.setItem('role', res.user.role)
    set({ token: res.token, user: res.user, isAuthenticated: true, role: res.user.role })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    set({ token: null, user: null, isAuthenticated: false, role: null })
  },

  fetchMe: async () => {
    try {
      const user = await api.get<User>('/auth/me')
      localStorage.setItem('role', user.role)
      set({ user, role: user.role, isAuthenticated: true })
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      set({ token: null, user: null, isAuthenticated: false, role: null })
    }
  },
}))
