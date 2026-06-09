export type UserRole = 'user' | 'ops' | 'supervisor' | 'admin'

export interface User {
  id: string
  phone?: string
  name: string
  role: UserRole
  creditScore: number
  balance: number
  deposit: number
  areaId?: string
  createdAt: string
}

export type VehicleStatus = 'available' | 'riding' | 'maintenance' | 'low_battery' | 'fault'

export interface Vehicle {
  id: string
  code: string
  lat: number
  lng: number
  battery: number
  status: VehicleStatus
  areaId: string
  lastReportTime: string
}

export type RideOrderStatus = 'riding' | 'completed' | 'charging'

export interface RideOrder {
  id: string
  userId: string
  vehicleId: string
  startTime: string
  endTime?: string
  startLat: number
  startLng: number
  endLat?: number
  endLng?: number
  distance: number
  duration: number
  fee: number
  dispatchFee: number
  creditDeducted: number
  inFence: boolean
  status: RideOrderStatus
}

export interface RideTrack {
  id: string
  orderId: string
  lat: number
  lng: number
  reportedAt: string
}

export type OpsTaskType = 'battery_swap' | 'repair' | 'dispatch'
export type OpsTaskStatus = 'pending' | 'in_progress' | 'completed'

export interface OpsTask {
  id: string
  type: OpsTaskType
  vehicleId: string
  vehicleCode: string
  vehicleLat: number
  vehicleLng: number
  battery?: number
  faultType?: string
  faultPhotos?: string[]
  status: OpsTaskStatus
  assignedTo: string
  priority: number
  createdAt: string
  completedAt?: string
  repairPhotos?: string[]
}

export interface OpsRoute {
  taskId: string
  waypoints: {
    vehicleId: string
    lat: number
    lng: number
    order: number
    battery?: number
    vehicleCode?: string
    address?: string
  }[]
  totalDistance: number
  estimatedTime: number
}

export interface AreaStats {
  areaId: string
  areaName: string
  vehicleCount: number
  availableCount: number
  turnoverRate: number
  faultRate: number
  rideCount: number
  revenue: number
  opsCost: number
}

export type HeatmapType = 'vehicle_density' | 'turnover' | 'fault'

export interface HeatmapData {
  lat: number
  lng: number
  intensity: number
  type: HeatmapType
}

export interface PricingTimeSlot {
  start: string
  end: string
  basePrice: number
  timeRate: number
  distanceRate: number
}

export interface WeatherAdjustment {
  condition: string
  multiplier: number
}

export interface PricingRule {
  id: string
  name: string
  timeSlots: PricingTimeSlot[]
  weatherAdjustments?: WeatherAdjustment[]
  active: boolean
  createdAt: string
}

export type NotificationType = 'unlock' | 'return' | 'fault' | 'dispatch' | 'system'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  content: string
  read: boolean
  createdAt: string
  relatedId?: string
  voucherUrl?: string
}

export interface MonthlyReport {
  month: string
  areas: {
    areaId: string
    areaName: string
    rideCount: number
    revenue: number
    opsCost: number
    profit: number
  }[]
  totalRides: number
  totalRevenue: number
  totalOpsCost: number
  totalProfit: number
}

export interface FaultReport {
  vehicleCode: string
  faultType: string
  photos: string[]
  description: string
}

export interface DashboardSummary {
  totalVehicles: number
  availableVehicles: number
  avgTurnoverRate: number
  faultRate: number
  totalRides: number
  totalRevenue: number
  totalOpsCost: number
  totalProfit: number
}
