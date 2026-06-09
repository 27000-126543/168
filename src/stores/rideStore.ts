import { create } from 'zustand'
import type { RideOrder } from '@/types'
import { api } from '@/utils/api'

interface RideState {
  currentRide: RideOrder | null
  rideHistory: RideOrder[]
  fee: number
  unlock: (vehicleId: string, paidDeposit: boolean) => Promise<RideOrder>
  reportPosition: (orderId: string, lat: number, lng: number) => Promise<void>
  returnBike: (orderId: string, lat: number, lng: number) => Promise<RideOrder>
  fetchHistory: () => Promise<void>
  fetchRide: (id: string) => Promise<void>
}

export const useRideStore = create<RideState>((set) => ({
  currentRide: null,
  rideHistory: [],
  fee: 0,

  unlock: async (vehicleId, paidDeposit) => {
    const order = await api.post<RideOrder>('/rides/unlock', { vehicleId, paidDeposit })
    set({ currentRide: order })
    return order
  },

  reportPosition: async (orderId, lat, lng) => {
    await api.post(`/rides/${orderId}/track`, { lat, lng })
  },

  returnBike: async (orderId, lat, lng) => {
    const order = await api.post<RideOrder>(`/rides/${orderId}/return`, { lat, lng })
    set({ currentRide: null, fee: order.fee })
    return order
  },

  fetchHistory: async () => {
    const history = await api.get<RideOrder[]>('/rides/history')
    set({ rideHistory: history })
  },

  fetchRide: async (id) => {
    const ride = await api.get<RideOrder>(`/rides/${id}`)
    set({ currentRide: ride })
  },
}))
