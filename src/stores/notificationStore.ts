import { create } from 'zustand'
import type { Notification } from '@/types'
import { api } from '@/utils/api'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    const notifications = await api.get<Notification[]>('/notifications')
    set({ notifications, unreadCount: notifications.filter((n) => !n.read).length })
  },

  markAsRead: async (id) => {
    await api.put(`/notifications/${id}/read`)
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },
}))
