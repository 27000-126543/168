import { Router, type Request, type Response } from 'express'
import { queryOne, queryAll } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

router.get('/nearby', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const radius = parseFloat(req.query.radius as string) || 2000

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: '请提供有效的经纬度' })
      return
    }

    const vehicles = queryAll("SELECT * FROM vehicles WHERE status = 'available'")
    const nearby: any[] = vehicles
      .map(v => ({
        ...v,
        distance: haversineDistance(lat, lng, v.lat, v.lng),
      }))
      .filter(v => v.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    let recommended = null
    if (nearby.length > 0) {
      const withBattery = nearby.filter(v => v.battery > 20)
      recommended = withBattery.length > 0 ? withBattery[0] : nearby[0]
    }

    res.json({
      success: true,
      data: {
        vehicles: nearby.map(v => ({
          id: v.id,
          code: v.code,
          lat: v.lat,
          lng: v.lng,
          battery: v.battery,
          status: v.status,
          areaId: v.area_id,
          distance: Math.round(v.distance),
        })),
        recommended: recommended ? {
          id: recommended.id,
          code: recommended.code,
          lat: recommended.lat,
          lng: recommended.lng,
          battery: recommended.battery,
          status: recommended.status,
          areaId: recommended.area_id,
          distance: Math.round(recommended.distance),
        } : null,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id])
    if (!vehicle) {
      res.status(404).json({ success: false, error: '车辆不存在' })
      return
    }
    const area = queryOne('SELECT * FROM areas WHERE id = ?', [vehicle.area_id])
    res.json({
      success: true,
      data: {
        id: vehicle.id,
        code: vehicle.code,
        lat: vehicle.lat,
        lng: vehicle.lng,
        battery: vehicle.battery,
        status: vehicle.status,
        areaId: vehicle.area_id,
        areaName: area?.name || '',
        lastReportTime: vehicle.last_report_time,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/', authMiddleware, requireRole('admin', 'supervisor'), async (req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = queryAll('SELECT * FROM vehicles ORDER BY area_id, status')
    const areas = queryAll('SELECT * FROM areas')
    const areaMap = areas.reduce((m: any, a: any) => { m[a.id] = a.name; return m }, {})

    res.json({
      success: true,
      data: vehicles.map(v => ({
        id: v.id,
        code: v.code,
        lat: v.lat,
        lng: v.lng,
        battery: v.battery,
        status: v.status,
        areaId: v.area_id,
        areaName: areaMap[v.area_id] || '',
        lastReportTime: v.last_report_time,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
