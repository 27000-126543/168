import { create } from 'zustand'
import type { User } from '@/types'
import { api } from '@/utils/api'

interface UserState {
  users: User[]
  loading: boolean
  fetchUsers: () => Promise<void>
  createUser: (data: Partial<User>) => Promise<void>
  updateUser: (id: string, data: Partial<User>) => Promise<void>
  reportFault: (data: { vehicleCode: string; faultType: string; photos: string[]; description: string }) => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  loading: false,

  fetchUsers: async () => {
    set({ loading: true })
    try {
      const users = await api.get<User[]>('/users')
      set({ users, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createUser: async (data) => {
    const user = await api.post<User>('/users', data)
    set((state) => ({ users: [...state.users, user] }))
  },

  updateUser: async (id, data) => {
    const user = await api.put<User>(`/users/${id}`, data)
    set((state) => ({ users: state.users.map((u) => (u.id === id ? user : u)) }))
  },

  reportFault: async (data) => {
    await api.post('/faults/report', data)
  },
}))
