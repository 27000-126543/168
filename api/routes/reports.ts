import { Router, type Request, type Response } from 'express'
import { queryOne, queryAll, run } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/monthly', authMiddleware, requireRole('admin', 'supervisor'), async (req: Request, res: Response): Promise<void> => {
  try {
    const month = req.query.month as string
    let reports = queryAll('SELECT * FROM monthly_reports ORDER BY month DESC, area_id')
    if (month) {
      reports = queryAll('SELECT * FROM monthly_reports WHERE month = ? ORDER BY area_id', [month])
    }

    const areas = queryAll('SELECT * FROM areas')
    const areaMap = areas.reduce((m: any, a: any) => { m[a.id] = a.name; return m }, {})

    const grouped: any = {}
    for (const r of reports) {
      if (!grouped[r.month]) {
        grouped[r.month] = { month: r.month, areas: [], totalRides: 0, totalRevenue: 0, totalOpsCost: 0, totalProfit: 0 }
      }
      grouped[r.month].areas.push({
        areaId: r.area_id,
        areaName: areaMap[r.area_id] || '',
        rideCount: r.ride_count,
        revenue: r.revenue,
        opsCost: r.ops_cost,
        profit: r.profit,
      })
      grouped[r.month].totalRides += r.ride_count
      grouped[r.month].totalRevenue += r.revenue
      grouped[r.month].totalOpsCost += r.ops_cost
      grouped[r.month].totalProfit += r.profit
    }

    res.json({ success: true, data: Object.values(grouped) })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/generate', authMiddleware, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.body
    if (!month) {
      res.status(400).json({ success: false, error: '请指定月份' })
      return
    }

    const areas = queryAll('SELECT * FROM areas')
    const vehicles = queryAll('SELECT * FROM vehicles')

    for (const area of areas) {
      const areaVehicles = vehicles.filter((v: any) => v.area_id === area.id)
      const vehicleIds = areaVehicles.map((v: any) => `'${v.id}'`).join(',')

      let rideCount = 0
      let revenue = 0
      let opsCost = 0

      if (vehicleIds) {
        const rides = queryAll(
          `SELECT * FROM ride_orders WHERE status = 'completed' AND vehicle_id IN (${vehicleIds}) AND strftime('%Y-%m', start_time) = ?`,
          [month]
        )
        rideCount = rides.length
        revenue = rides.reduce((sum: number, r: any) => sum + r.fee + r.dispatch_fee, 0)
      }

      const tasks = queryAll(
        "SELECT * FROM ops_tasks WHERE status = 'completed' AND assigned_to IN (SELECT id FROM users WHERE area_id = ?) AND strftime('%Y-%m', completed_at) = ?",
        [area.id, month]
      )
      opsCost = tasks.length * 150

      const profit = revenue - opsCost

      const existing = queryOne('SELECT * FROM monthly_reports WHERE month = ? AND area_id = ?', [month, area.id])
      if (existing) {
        run('UPDATE monthly_reports SET ride_count=?, revenue=?, ops_cost=?, profit=? WHERE id=?',
          [rideCount, Math.round(revenue * 100) / 100, opsCost, Math.round(profit * 100) / 100, existing.id])
      } else {
        const id = 'mr' + Date.now() + area.id
        run('INSERT INTO monthly_reports (id, month, area_id, ride_count, revenue, ops_cost, profit) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, month, area.id, rideCount, Math.round(revenue * 100) / 100, opsCost, Math.round(profit * 100) / 100])
      }
    }

    const supervisors = queryAll("SELECT * FROM users WHERE role = 'supervisor'")
    for (const sup of supervisors) {
      run(
        'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
        [`nrg_s${Date.now()}${sup.id}`, sup.id, 'system', `${month}月度运营报告已生成`, `${month}月度运营报告已生成，请查看各区域骑行量、收入和运维成本数据。`, month]
      )
    }

    const allAdmins = queryAll("SELECT * FROM users WHERE role = 'admin'")
    for (const admin of allAdmins) {
      if (admin.id !== req.user!.id) {
        run(
          'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
          [`nrg_a${Date.now()}${admin.id}`, admin.id, 'system', `${month}月度运营报告已生成`, `${month}月度运营报告已生成，请查看各区域骑行量、收入和运维成本数据。`, month]
        )
      }
    }

    res.json({ success: true, data: { month, message: '月度报告已生成' } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
