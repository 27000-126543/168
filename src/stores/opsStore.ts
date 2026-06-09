import { create } from 'zustand'
import type { OpsTask, OpsRoute } from '@/types'
import { api } from '@/utils/api'

interface OpsState {
  tasks: OpsTask[]
  allTasks: OpsTask[]
  currentRoute: OpsRoute | null
  loading: boolean
  fetchTasks: () => Promise<void>
  fetchAllTasks: (filters?: { area_id?: string; type?: string; overtime?: boolean }) => Promise<void>
  completeTask: (taskId: string, repairPhotos?: string[]) => Promise<void>
  fetchRoute: () => Promise<void>
}

export const useOpsStore = create<OpsState>((set) => ({
  tasks: [],
  allTasks: [],
  currentRoute: null,
  loading: false,

  fetchTasks: async () => {
    set({ loading: true })
    try {
      const tasks = await api.get<OpsTask[]>('/ops/tasks')
      set({ tasks, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchAllTasks: async (filters) => {
    set({ loading: true })
    try {
      let url = '/ops/tasks/all'
      const params: string[] = []
      if (filters?.area_id) params.push(`area_id=${filters.area_id}`)
      if (filters?.type) params.push(`type=${filters.type}`)
      if (filters?.overtime) params.push('overtime=true')
      if (params.length > 0) url += '?' + params.join('&')
      const allTasks = await api.get<OpsTask[]>(url)
      set({ allTasks, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  completeTask: async (taskId, repairPhotos) => {
    await api.put(`/ops/tasks/${taskId}`, { status: 'completed', repairPhotos })
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status: 'completed' as const } : t)),
      allTasks: state.allTasks.map((t) => (t.id === taskId ? { ...t, status: 'completed' as const } : t)),
    }))
  },

  fetchRoute: async () => {
    set({ loading: true })
    try {
      const route = await api.get<OpsRoute>('/ops/route')
      set({ currentRoute: route, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
