import { create } from 'zustand'
import type { AreaStats, HeatmapData, HeatmapType, DashboardSummary } from '@/types'
import { api } from '@/utils/api'

interface StatsState {
  areaStats: AreaStats[]
  heatmapData: HeatmapData[]
  dashboardSummary: DashboardSummary | null
  loading: boolean
  fetchAreaStats: () => Promise<void>
  fetchHeatmap: (type: HeatmapType) => Promise<void>
  fetchDashboard: () => Promise<void>
}

export const useStatsStore = create<StatsState>((set) => ({
  areaStats: [],
  heatmapData: [],
  dashboardSummary: null,
  loading: false,

  fetchAreaStats: async () => {
    set({ loading: true })
    try {
      const areaStats = await api.get<AreaStats[]>('/stats/areas')
      set({ areaStats, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchHeatmap: async (type) => {
    set({ loading: true })
    try {
      const heatmapData = await api.get<HeatmapData[]>(`/stats/heatmap?type=${type}`)
      set({ heatmapData, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchDashboard: async () => {
    set({ loading: true })
    try {
      const dashboardSummary = await api.get<DashboardSummary>('/stats/dashboard')
      set({ dashboardSummary, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
