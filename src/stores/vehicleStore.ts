import { create } from 'zustand'
import type { Vehicle } from '@/types'
import { api } from '@/utils/api'

interface VehicleState {
  vehicles: Vehicle[]
  nearbyVehicles: Vehicle[]
  recommended: Vehicle | null
  loading: boolean
  fetchNearby: (lat: number, lng: number, radius: number) => Promise<void>
  fetchAll: () => Promise<void>
}

export const useVehicleStore = create<VehicleState>((set) => ({
  vehicles: [],
  nearbyVehicles: [],
  recommended: null,
  loading: false,

  fetchNearby: async (lat, lng, radius) => {
    set({ loading: true })
    try {
      const res = await api.get<{ vehicles: Vehicle[]; recommended: Vehicle }>(
        `/vehicles/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
      )
      set({ nearbyVehicles: res.vehicles, recommended: res.recommended, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchAll: async () => {
    set({ loading: true })
    try {
      const vehicles = await api.get<Vehicle[]>('/vehicles')
      set({ vehicles, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
