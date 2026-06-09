import { create } from 'zustand'
import type { MonthlyReport, AreaDetailReport } from '@/types'
import { api } from '@/utils/api'

interface ReportState {
  monthlyReports: MonthlyReport[]
  areaDetail: AreaDetailReport | null
  loading: boolean
  fetchMonthly: (month?: string) => Promise<void>
  generateReport: (month: string) => Promise<void>
  fetchAreaDetail: (areaId: string) => Promise<void>
  clearAreaDetail: () => void
}

export const useReportStore = create<ReportState>((set) => ({
  monthlyReports: [],
  areaDetail: null,
  loading: false,

  fetchMonthly: async (month) => {
    set({ loading: true })
    try {
      const url = month ? `/reports/monthly?month=${month}` : '/reports/monthly'
      const monthlyReports = await api.get<MonthlyReport[]>(url)
      set({ monthlyReports, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  generateReport: async (month) => {
    set({ loading: true })
    try {
      await api.post('/reports/generate', { month })
      const monthlyReports = await api.get<MonthlyReport[]>(`/reports/monthly?month=${month}`)
      set({ monthlyReports, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchAreaDetail: async (areaId) => {
    try {
      const areaDetail = await api.get<AreaDetailReport>(`/reports/area-detail?area_id=${areaId}`)
      set({ areaDetail })
    } catch {
      set({ areaDetail: null })
    }
  },

  clearAreaDetail: () => set({ areaDetail: null }),
}))
