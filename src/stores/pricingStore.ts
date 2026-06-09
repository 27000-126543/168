import { create } from 'zustand'
import type { PricingRule, WeatherAdjustment } from '@/types'
import { api } from '@/utils/api'

interface PricingState {
  rules: PricingRule[]
  weatherConfig: WeatherAdjustment[]
  loading: boolean
  fetchRules: () => Promise<void>
  createRule: (data: Omit<PricingRule, 'id' | 'createdAt'>) => Promise<void>
  updateRule: (id: string, data: Partial<PricingRule>) => Promise<void>
  fetchWeather: () => Promise<void>
  updateWeather: (data: WeatherAdjustment[]) => Promise<void>
}

export const usePricingStore = create<PricingState>((set) => ({
  rules: [],
  weatherConfig: [],
  loading: false,

  fetchRules: async () => {
    set({ loading: true })
    try {
      const rules = await api.get<PricingRule[]>('/pricing/rules')
      set({ rules, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createRule: async (data) => {
    const rule = await api.post<PricingRule>('/pricing/rules', data)
    set((state) => ({ rules: [...state.rules, rule] }))
  },

  updateRule: async (id, data) => {
    const rule = await api.put<PricingRule>(`/pricing/rules/${id}`, data)
    set((state) => ({ rules: state.rules.map((r) => (r.id === id ? rule : r)) }))
  },

  fetchWeather: async () => {
    set({ loading: true })
    try {
      const weatherConfig = await api.get<WeatherAdjustment[]>('/pricing/weather')
      set({ weatherConfig, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  updateWeather: async (data) => {
    await api.put('/pricing/weather', data)
    set({ weatherConfig: data })
  },
}))
