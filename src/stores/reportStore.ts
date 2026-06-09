import { create } from 'zustand'
import type { MonthlyReport } from '@/types'
import { api } from '@/utils/api'

interface ReportState {
  monthlyReports: MonthlyReport[]
  loading: boolean
  fetchMonthly: () => Promise<void>
  generateReport: () => Promise<void>
}

export const useReportStore = create<ReportState>((set) => ({
  monthlyReports: [],
  loading: false,

  fetchMonthly: async () => {
    set({ loading: true })
    try {
      const monthlyReports = await api.get<MonthlyReport[]>('/reports/monthly')
      set({ monthlyReports, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  generateReport: async () => {
    set({ loading: true })
    try {
      const report = await api.post<MonthlyReport>('/reports/generate')
      set((state) => ({ monthlyReports: [...state.monthlyReports, report], loading: false }))
    } catch {
      set({ loading: false })
    }
  },
}))
