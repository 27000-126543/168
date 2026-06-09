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
        grouped[r.month] = { month: r.month, areas: [], totalRides: 0, totalRevenue: 0, totalDispatchRevenue: 0, totalOpsCost: 0, totalBatterySwapCost: 0, totalRepairCost: 0, totalArrearsAmount: 0, totalProfit: 0 }
      }
      grouped[r.month].areas.push({
        areaId: r.area_id,
        areaName: areaMap[r.area_id] || '',
        rideCount: r.ride_count,
        revenue: r.revenue,
        dispatchRevenue: r.dispatch_revenue || 0,
        opsCost: r.ops_cost,
        batterySwapCost: r.battery_swap_cost || 0,
        repairCost: r.repair_cost || 0,
        arrearsAmount: r.arrears_amount || 0,
        profit: r.profit,
      })
      grouped[r.month].totalRides += r.ride_count
      grouped[r.month].totalRevenue += r.revenue
      grouped[r.month].totalDispatchRevenue += r.dispatch_revenue || 0
      grouped[r.month].totalOpsCost += r.ops_cost
      grouped[r.month].totalBatterySwapCost += r.battery_swap_cost || 0
      grouped[r.month].totalRepairCost += r.repair_cost || 0
      grouped[r.month].totalArrearsAmount += r.arrears_amount || 0
      grouped[r.month].totalProfit += r.profit
    }

    res.json({ success: true, data: Object.values(grouped) })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/area-detail', authMiddleware, requireRole('admin', 'supervisor'), async (req: Request, res: Response): Promise<void> => {
  try {
    const areaId = req.query.area_id as string
    if (!areaId) {
      res.status(400).json({ success: false, error: '请指定区域' })
      return
    }
    const reports = queryAll('SELECT * FROM monthly_reports WHERE area_id = ? ORDER BY month DESC', [areaId])
    const area = queryOne('SELECT * FROM areas WHERE id = ?', [areaId])

    const data = reports.map(r => ({
      month: r.month,
      rideCount: r.ride_count,
      revenue: r.revenue,
      dispatchRevenue: r.dispatch_revenue || 0,
      opsCost: r.ops_cost,
      batterySwapCost: r.battery_swap_cost || 0,
      repairCost: r.repair_cost || 0,
      arrearsAmount: r.arrears_amount || 0,
      profit: r.profit,
    }))

    res.json({ success: true, data: { areaId, areaName: area?.name || '', reports: data } })
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
      let dispatchRevenue = 0
      let opsCost = 0
      let batterySwapCost = 0
      let repairCost = 0
      let arrearsAmount = 0

      if (vehicleIds) {
        const rides = queryAll(
          `SELECT * FROM ride_orders WHERE status = 'completed' AND vehicle_id IN (${vehicleIds}) AND strftime('%Y-%m', start_time) = ?`,
          [month]
        )
        rideCount = rides.length
        revenue = rides.reduce((sum: number, r: any) => sum + r.fee, 0)
        dispatchRevenue = rides.reduce((sum: number, r: any) => sum + r.dispatch_fee, 0)

        const areaRideIds = rides.map((r: any) => `'${r.id}'`).join(',')
        if (areaRideIds) {
          const arrearsTx = queryAll(
            `SELECT t.* FROM transactions t WHERE t.type IN ('ride_fee', 'dispatch_fee') AND t.status = 'arrears' AND t.related_id IN (${areaRideIds})`,
            []
          )
          arrearsAmount = Math.abs(arrearsTx.reduce((sum: number, t: any) => sum + t.amount, 0))
        }
      }

      const swapTasks = queryAll(
        "SELECT * FROM ops_tasks WHERE type = 'battery_swap' AND status = 'completed' AND assigned_to IN (SELECT id FROM users WHERE area_id = ?) AND strftime('%Y-%m', completed_at) = ?",
        [area.id, month]
      )
      batterySwapCost = swapTasks.length * 100

      const repairTasks = queryAll(
        "SELECT * FROM ops_tasks WHERE type = 'repair' AND status = 'completed' AND assigned_to IN (SELECT id FROM users WHERE area_id = ?) AND strftime('%Y-%m', completed_at) = ?",
        [area.id, month]
      )
      repairCost = repairTasks.length * 200

      opsCost = batterySwapCost + repairCost
      const profit = revenue + dispatchRevenue - opsCost

      const existing = queryOne('SELECT * FROM monthly_reports WHERE month = ? AND area_id = ?', [month, area.id])
      if (existing) {
        run('UPDATE monthly_reports SET ride_count=?, revenue=?, dispatch_revenue=?, ops_cost=?, battery_swap_cost=?, repair_cost=?, arrears_amount=?, profit=? WHERE id=?',
          [rideCount, Math.round(revenue * 100) / 100, Math.round(dispatchRevenue * 100) / 100, opsCost, batterySwapCost, repairCost, Math.round(arrearsAmount * 100) / 100, Math.round(profit * 100) / 100, existing.id])
      } else {
        const id = 'mr' + Date.now() + area.id
        run('INSERT INTO monthly_reports (id, month, area_id, ride_count, revenue, dispatch_revenue, ops_cost, battery_swap_cost, repair_cost, arrears_amount, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, month, area.id, rideCount, Math.round(revenue * 100) / 100, Math.round(dispatchRevenue * 100) / 100, opsCost, batterySwapCost, repairCost, Math.round(arrearsAmount * 100) / 100, Math.round(profit * 100) / 100])
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

router.get('/dashboard', authMiddleware, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const month = req.query.month as string
    if (!month) {
      res.status(400).json({ success: false, error: '请指定月份' })
      return
    }

    const reports = queryAll('SELECT * FROM monthly_reports WHERE month = ?', [month])
    const totalRevenue = reports.reduce((s: number, r: any) => s + r.revenue, 0)
    const totalDispatchRevenue = reports.reduce((s: number, r: any) => s + (r.dispatch_revenue || 0), 0)
    const totalOpsCost = reports.reduce((s: number, r: any) => s + r.ops_cost, 0)
    const totalArrears = reports.reduce((s: number, r: any) => s + (r.arrears_amount || 0), 0)
    const totalProfit = reports.reduce((s: number, r: any) => s + r.profit, 0)
    const totalRides = reports.reduce((s: number, r: any) => s + r.ride_count, 0)

    const overtimeTasks = queryAll(
      `SELECT ot.*, v.code AS vehicle_code, v.area_id AS vehicle_area_id FROM ops_tasks ot LEFT JOIN vehicles v ON ot.vehicle_id = v.id WHERE ot.status != 'completed' AND (unixepoch() - unixepoch(ot.created_at)) > 7200`
    )
    const pendingTasks = queryAll("SELECT * FROM ops_tasks WHERE status = 'pending'")

    const areas = queryAll('SELECT * FROM areas')
    const areaBreakdown = reports.map((r: any) => {
      const area = areas.find((a: any) => a.id === r.area_id)
      return {
        areaId: r.area_id,
        areaName: area?.name || '',
        revenue: r.revenue,
        dispatchRevenue: r.dispatch_revenue || 0,
        opsCost: r.ops_cost,
        arrearsAmount: r.arrears_amount || 0,
        profit: r.profit,
      }
    })

    res.json({
      success: true,
      data: {
        month,
        revenue: Math.round(totalRevenue * 100) / 100,
        dispatchRevenue: Math.round(totalDispatchRevenue * 100) / 100,
        opsCost: totalOpsCost,
        arrearsAmount: Math.round(totalArrears * 100) / 100,
        profit: Math.round(totalProfit * 100) / 100,
        rideCount: totalRides,
        overtimeTaskCount: overtimeTasks.length,
        pendingTaskCount: pendingTasks.length,
        areaBreakdown,
        overtimeTasks: overtimeTasks.map((t: any) => ({
          id: t.id,
          type: t.type,
          vehicleCode: t.vehicle_code,
          vehicleAreaId: t.vehicle_area_id,
          createdAt: t.created_at,
        })),
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
