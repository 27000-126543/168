import { create } from 'zustand'
import type { RideOrder } from '@/types'
import { api } from '@/utils/api'

interface UnlockResult {
  orderId: string | null
  needDeposit: boolean
  depositAmount: number
  vehicleCode: string
  message?: string
  startTime?: string
}

interface RideState {
  currentRide: RideOrder | null
  rideHistory: RideOrder[]
  fee: number
  lastReturnResult: { fee: number; dispatchFee: number; totalFee: number; inFence: boolean; creditDeducted: number; balanceInsufficient: boolean; newBalance: number; newCreditScore: number } | null
  unlock: (vehicleId: string, paidDeposit: boolean) => Promise<UnlockResult>
  reportPosition: (orderId: string, lat: number, lng: number) => Promise<void>
  returnBike: (orderId: string, lat: number, lng: number) => Promise<RideOrder>
  fetchHistory: () => Promise<void>
  fetchRide: (id: string) => Promise<void>
  clearReturnResult: () => void
}

export const useRideStore = create<RideState>((set) => ({
  currentRide: null,
  rideHistory: [],
  fee: 0,
  lastReturnResult: null,

  unlock: async (vehicleId, paidDeposit) => {
    const result = await api.post<UnlockResult>('/rides/unlock', { vehicleId, paidDeposit })
    if (result.orderId) {
      set({ currentRide: { id: result.orderId, vehicleId, startTime: result.startTime || '', status: 'riding', fee: 0, dispatchFee: 0, distance: 0, duration: 0, inFence: true, creditDeducted: 0, userId: '', startLat: 0, startLng: 0 } as RideOrder })
    }
    return result
  },

  reportPosition: async (orderId, lat, lng) => {
    await api.post(`/rides/${orderId}/track`, { lat, lng })
  },

  returnBike: async (orderId, lat, lng) => {
    const result = await api.post<any>(`/rides/${orderId}/return`, { lat, lng })
    set({
      currentRide: null,
      fee: result.fee,
      lastReturnResult: result,
    })
    return result as RideOrder
  },

  fetchHistory: async () => {
    const history = await api.get<RideOrder[]>('/rides/history')
    set({ rideHistory: history })
  },

  fetchRide: async (id) => {
    const ride = await api.get<RideOrder>(`/rides/${id}`)
    set({ currentRide: ride })
  },

  clearReturnResult: () => set({ lastReturnResult: null }),
}))
