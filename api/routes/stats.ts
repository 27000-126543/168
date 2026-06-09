import { Router, type Request, type Response } from 'express'
import { queryAll } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/areas', authMiddleware, requireRole('supervisor', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const areas = queryAll('SELECT * FROM areas')
    const data = areas.map(area => {
      const vehicles = queryAll('SELECT * FROM vehicles WHERE area_id = ?', [area.id])
      const rideOrders = queryAll(
        "SELECT * FROM ride_orders WHERE status = 'completed' AND vehicle_id IN (SELECT id FROM vehicles WHERE area_id = ?)",
        [area.id]
      )
      const faultVehicles = vehicles.filter((v: any) => v.status === 'fault' || v.status === 'maintenance')
      const totalRides = rideOrders.length
      const totalRevenue = rideOrders.reduce((sum: number, r: any) => sum + (r.fee + r.dispatch_fee), 0)
      const availableCount = vehicles.filter((v: any) => v.status === 'available').length
      const turnoverRate = vehicles.length > 0 ? Math.round(totalRides / vehicles.length * 100) / 100 : 0
      const faultRate = vehicles.length > 0 ? Math.round(faultVehicles.length / vehicles.length * 100) : 0

      return {
        areaId: area.id,
        areaName: area.name,
        vehicleCount: vehicles.length,
        availableCount,
        turnoverRate,
        faultRate,
        rideCount: totalRides,
        revenue: Math.round(totalRevenue * 100) / 100,
      }
    })
    res.json({ success: true, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/heatmap', authMiddleware, requireRole('supervisor', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string || 'vehicle_density'
    const vehicles = queryAll("SELECT * FROM vehicles")
    const areas = queryAll('SELECT * FROM areas')

    const heatmapData = areas.map(area => {
      const areaVehicles = vehicles.filter((v: any) => v.area_id === area.id)
      const bounds = JSON.parse(area.bounds)
      const center = bounds.center || [39.9, 116.4]

      let intensity = 0
      if (type === 'vehicle_density') {
        intensity = areaVehicles.length
      } else if (type === 'turnover') {
        const completedRides = queryAll(
          "SELECT COUNT(*) as cnt FROM ride_orders WHERE status = 'completed' AND vehicle_id IN (SELECT id FROM vehicles WHERE area_id = ?)",
          [area.id]
        )
        const count = completedRides[0]?.cnt || 0
        intensity = areaVehicles.length > 0 ? Math.round(Number(count) / areaVehicles.length * 100) / 100 : 0
      } else if (type === 'fault') {
        const faultCount = areaVehicles.filter((v: any) => v.status === 'fault' || v.status === 'maintenance').length
        intensity = areaVehicles.length > 0 ? Math.round(faultCount / areaVehicles.length * 100) : 0
      }

      return {
        lat: center[0],
        lng: center[1],
        intensity,
        areaId: area.id,
        areaName: area.name,
        type,
      }
    })

    res.json({ success: true, data: heatmapData })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/dashboard', authMiddleware, requireRole('supervisor', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const totalVehicles = queryAll("SELECT * FROM vehicles")
    const availableVehicles = totalVehicles.filter((v: any) => v.status === 'available')
    const ridingVehicles = totalVehicles.filter((v: any) => v.status === 'riding')
    const lowBatteryVehicles = totalVehicles.filter((v: any) => v.status === 'low_battery')
    const faultVehicles = totalVehicles.filter((v: any) => v.status === 'fault' || v.status === 'maintenance')

    const allRides = queryAll("SELECT * FROM ride_orders WHERE status = 'completed'")
    const totalRevenue = allRides.reduce((sum: number, r: any) => sum + r.fee + r.dispatch_fee, 0)

    const pendingTasks = queryAll("SELECT * FROM ops_tasks WHERE status = 'pending'")
    const inProgressTasks = queryAll("SELECT * FROM ops_tasks WHERE status = 'in_progress'")

    const areas = queryAll('SELECT * FROM areas')
    const areaStats = areas.map(area => {
      const areaVehicles = totalVehicles.filter((v: any) => v.area_id === area.id)
      return { areaId: area.id, areaName: area.name, vehicleCount: areaVehicles.length }
    })

    res.json({
      success: true,
      data: {
        totalVehicles: totalVehicles.length,
        availableVehicles: availableVehicles.length,
        ridingVehicles: ridingVehicles.length,
        lowBatteryVehicles: lowBatteryVehicles.length,
        faultVehicles: faultVehicles.length,
        totalRides: allRides.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        pendingTasks: pendingTasks.length,
        inProgressTasks: inProgressTasks.length,
        areaStats,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
