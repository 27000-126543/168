import { create } from 'zustand'
import type { MonthlyReport } from '@/types'
import { api } from '@/utils/api'

interface ReportState {
  monthlyReports: MonthlyReport[]
  loading: boolean
  fetchMonthly: (month?: string) => Promise<void>
  generateReport: (month: string) => Promise<void>
}

export const useReportStore = create<ReportState>((set) => ({
  monthlyReports: [],
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
}))
