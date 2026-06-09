import { Router, type Request, type Response } from 'express'
import { queryOne, queryAll, run } from '../db.js'
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

router.get('/tasks', authMiddleware, requireRole('ops'), async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = queryAll(
      `SELECT ot.*, v.code AS vehicle_code, v.area_id AS vehicle_area_id, v.lat AS vehicle_lat, v.lng AS vehicle_lng FROM ops_tasks ot LEFT JOIN vehicles v ON ot.vehicle_id = v.id WHERE ot.assigned_to = ? ORDER BY ot.priority DESC, ot.created_at ASC`,
      [req.user!.id]
    )
    res.json({
      success: true,
      data: tasks.map(formatTask),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId, type, faultType, faultPhotos } = req.body

    const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [vehicleId])
    if (!vehicle) {
      res.status(404).json({ success: false, error: '车辆不存在' })
      return
    }

    const opsUsers = queryAll("SELECT * FROM users WHERE role = 'ops'")
    let assignedTo = opsUsers[0]?.id
    if (opsUsers.length > 1) {
      opsUsers.sort((a: any, b: any) => {
        const aArea = queryOne('SELECT * FROM areas WHERE id = ?', [a.area_id])
        const bArea = queryOne('SELECT * FROM areas WHERE id = ?', [b.area_id])
        if (aArea && bArea) {
          const aBounds = JSON.parse(aArea.bounds)
          const bBounds = JSON.parse(bArea.bounds)
          const aDist = haversineDistance(vehicle.lat, vehicle.lng, aBounds.center[0], aBounds.center[1])
          const bDist = haversineDistance(vehicle.lat, vehicle.lng, bBounds.center[0], bBounds.center[1])
          return aDist - bDist
        }
        return 0
      })
      assignedTo = opsUsers[0].id
    }

    const taskId = 'ot' + Date.now()
    const now = new Date().toISOString()
    const priority = type === 'repair' ? 3 : type === 'battery_swap' ? 2 : 1

    run(
      'INSERT INTO ops_tasks (id, type, vehicle_id, fault_type, fault_photos, status, assigned_to, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, type, vehicleId, faultType || null, faultPhotos ? JSON.stringify(faultPhotos) : null, 'pending', assignedTo, priority, now]
    )

    if (type === 'repair') {
      run("UPDATE vehicles SET status = 'fault' WHERE id = ?", [vehicleId])
    }

    run(
      'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['n' + Date.now(), assignedTo, 'dispatch',
        '新任务分配',
        `您有新的${type === 'battery_swap' ? '换电' : type === 'repair' ? '维修' : '调度'}任务：车辆 ${vehicle.code}，请及时处理`,
        taskId]
    )

    res.json({
      success: true,
      data: { taskId, assignedTo },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/tasks/:id', authMiddleware, requireRole('ops'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, repairPhotos, newBattery } = req.body
    const task = queryOne('SELECT * FROM ops_tasks WHERE id = ?', [req.params.id])
    if (!task) {
      res.status(404).json({ success: false, error: '任务不存在' })
      return
    }

    const now = new Date().toISOString()
    if (status === 'completed') {
      const photos = repairPhotos ? JSON.stringify(repairPhotos) : null
      run(
        'UPDATE ops_tasks SET status=?, completed_at=?, repair_photos=? WHERE id=?',
        ['completed', now, photos, req.params.id]
      )

      const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [task.vehicle_id])
      if (vehicle) {
        if (task.type === 'battery_swap') {
          const battery = newBattery || 100
          run("UPDATE vehicles SET battery=?, status='available' WHERE id=?", [battery, task.vehicle_id])
        } else if (task.type === 'repair') {
          run("UPDATE vehicles SET status='available' WHERE id=?", [task.vehicle_id])
        }
      }

      run(
        "UPDATE notifications SET title = REPLACE(title, '[超时]', '[已处理]'), content = content || '（该任务已完成）' WHERE type = 'system' AND related_id = ? AND title LIKE '[超时]%'",
        [req.params.id]
      )

      const opsUser = queryOne('SELECT * FROM users WHERE id = ?', [req.user!.id])
      const vehicleCode = vehicle?.code || task.vehicle_id
      const taskTypeLabel = task.type === 'battery_swap' ? '换电' : task.type === 'repair' ? '维修' : '调度'
      const photoInfo = photos ? '，已上传维修照片' : ''

      const supervisors = queryAll("SELECT * FROM users WHERE role = 'supervisor'")
      for (const sup of supervisors) {
        if (vehicle && sup.area_id === vehicle.area_id) {
          run(
            'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
            [`ns${Date.now()}${sup.id}`, sup.id, 'system',
              `${taskTypeLabel}任务完成`,
              `车辆${vehicleCode}的${taskTypeLabel}任务已完成。处理人：${opsUser?.name || req.user!.id}，完成时间：${now}${photoInfo}。`,
              req.params.id]
          )
        }
      }

      const allAdmins = queryAll("SELECT * FROM users WHERE role = 'admin'")
      for (const admin of allAdmins) {
        run(
          'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
          [`na${Date.now()}${admin.id}`, admin.id, 'system',
            `${taskTypeLabel}任务完成`,
            `车辆${vehicleCode}的${taskTypeLabel}任务已完成。处理人：${opsUser?.name || req.user!.id}，完成时间：${now}${photoInfo}。`,
            req.params.id]
        )
      }

      const faultNotif = queryOne(
        "SELECT user_id FROM notifications WHERE type = 'fault' AND related_id = ?",
        [req.params.id]
      )
      if (faultNotif) {
        run(
          'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
          [`nf${Date.now()}${faultNotif.user_id}`, faultNotif.user_id, 'system',
            `${taskTypeLabel}任务完成`,
            `车辆${vehicleCode}的${taskTypeLabel}任务已完成，感谢您的举报`,
            req.params.id]
        )
      }
    } else if (status === 'in_progress') {
      run('UPDATE ops_tasks SET status=? WHERE id=?', ['in_progress', req.params.id])
    }

    res.json({ success: true, data: { taskId: req.params.id, status, completedAt: status === 'completed' ? now : null } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/route', authMiddleware, requireRole('ops'), async (req: Request, res: Response): Promise<void> => {
  try {
    const areaId = req.query.area_id as string
    const lowBatteryVehicles = queryAll(
      "SELECT * FROM vehicles WHERE (status = 'low_battery' OR battery <= 20) AND status != 'riding'",
      []
    ).filter(v => !areaId || v.area_id === areaId)

    if (lowBatteryVehicles.length === 0) {
      res.json({ success: true, data: { waypoints: [], totalDistance: 0, estimatedTime: 0 } })
      return
    }

    const opsUser = queryOne('SELECT * FROM users WHERE id = ?', [req.user!.id])
    let currentLat = 39.92
    let currentLng = 116.40
    if (opsUser?.area_id) {
      const area = queryOne('SELECT * FROM areas WHERE id = ?', [opsUser.area_id])
      if (area) {
        const bounds = JSON.parse(area.bounds)
        currentLat = bounds.center[0]
        currentLng = bounds.center[1]
      }
    }

    const remaining = [...lowBatteryVehicles]
    const waypoints: any[] = []
    let totalDistance = 0

    while (remaining.length > 0) {
      let nearestIdx = 0
      let nearestDist = Infinity
      for (let i = 0; i < remaining.length; i++) {
        const dist = haversineDistance(currentLat, currentLng, remaining[i].lat, remaining[i].lng)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestIdx = i
        }
      }
      const nearest = remaining.splice(nearestIdx, 1)[0]
      totalDistance += nearestDist
      waypoints.push({
        vehicleId: nearest.id,
        vehicleCode: nearest.code,
        lat: nearest.lat,
        lng: nearest.lng,
        battery: nearest.battery,
        order: waypoints.length + 1,
        distance: Math.round(nearestDist),
      })
      currentLat = nearest.lat
      currentLng = nearest.lng
    }

    const estimatedTime = Math.round(totalDistance / 200 + waypoints.length * 10)

    res.json({
      success: true,
      data: {
        taskId: 'route_' + Date.now(),
        waypoints,
        totalDistance: Math.round(totalDistance),
        estimatedTime,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/tasks/overtime-check', authMiddleware, requireRole('supervisor', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const overtimeTasks = queryAll(
      `SELECT ot.*, v.code AS vehicle_code, v.area_id AS vehicle_area_id, v.lat AS vehicle_lat, v.lng AS vehicle_lng FROM ops_tasks ot LEFT JOIN vehicles v ON ot.vehicle_id = v.id WHERE ot.status != 'completed' AND (unixepoch() - unixepoch(ot.created_at)) > 7200`
    )

    for (const task of overtimeTasks) {
      const taskTypeLabel = task.type === 'battery_swap' ? '换电' : task.type === 'repair' ? '维修' : '调度'
      const vehicleCode = task.vehicle_code || task.vehicle_id
      const elapsed = Math.round((Date.now() - new Date(task.created_at).getTime()) / 3600000)

      let alertLevel = '超时提醒'
      let levelTag = '超时'
      if (elapsed > 8) { alertLevel = '紧急超时'; levelTag = '紧急' }
      else if (elapsed > 4) { alertLevel = '严重超时'; levelTag = '严重' }

      const newTitle = `[超时][${levelTag}] 运维任务${alertLevel}`
      const newContent = `车辆${vehicleCode}的${taskTypeLabel}任务已超时${elapsed}小时未完成，请关注处理。`

      const recipients: { id: string; prefix: string }[] = []

      if (task.vehicle_area_id) {
        const supervisors = queryAll("SELECT * FROM users WHERE role = 'supervisor' AND area_id = ?", [task.vehicle_area_id])
        for (const sup of supervisors) {
          recipients.push({ id: sup.id, prefix: 'os' })
        }
      }

      const allAdmins = queryAll("SELECT * FROM users WHERE role = 'admin'")
      for (const admin of allAdmins) {
        recipients.push({ id: admin.id, prefix: 'oa' })
      }

      for (const r of recipients) {
        const existing = queryOne(
          "SELECT id FROM notifications WHERE user_id = ? AND type = 'system' AND related_id = ? AND title LIKE '[超时]%'",
          [r.id, task.id]
        )
        if (existing) {
          run(
            "UPDATE notifications SET title = ?, content = ? WHERE id = ?",
            [newTitle, newContent, existing.id]
          )
        } else {
          run(
            'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
            [`${r.prefix}${Date.now()}${r.id}`, r.id, 'system', newTitle, newContent, task.id]
          )
        }
      }
    }

    res.json({
      success: true,
      data: { count: overtimeTasks.length },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/sla-stats', authMiddleware, requireRole('supervisor', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const areas = queryAll('SELECT * FROM areas')
    const allTasks = queryAll(
      `SELECT ot.*, v.area_id AS vehicle_area_id FROM ops_tasks ot LEFT JOIN vehicles v ON ot.vehicle_id = v.id`
    )

    const areasData = areas.map((area: any) => {
      const areaTasks = allTasks.filter((t: any) => t.vehicle_area_id === area.id)

      const completed = areaTasks.filter((t: any) => t.status === 'completed' && t.completed_at && t.created_at)
      const calcAvg = (type: string) => {
        const typed = completed.filter((t: any) => t.type === type)
        if (typed.length === 0) return 0
        const total = typed.reduce((sum: number, t: any) => {
          return sum + (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 3600000
        }, 0)
        return Math.round((total / typed.length) * 100) / 100
      }

      const overtimeCount = areaTasks.filter((t: any) =>
        t.status !== 'completed' && (Date.now() - new Date(t.created_at).getTime()) > 7200000
      ).length
      const pendingCount = areaTasks.filter((t: any) => t.status === 'pending').length
      const inProgressCount = areaTasks.filter((t: any) => t.status === 'in_progress').length

      return {
        areaId: area.id,
        areaName: area.name,
        avgProcessingTime: {
          battery_swap: calcAvg('battery_swap'),
          repair: calcAvg('repair'),
          dispatch: calcAvg('dispatch'),
        },
        overtimeCount,
        pendingCount,
        inProgressCount,
      }
    })

    const totalOvertime = areasData.reduce((s: number, a: any) => s + a.overtimeCount, 0)
    const totalPending = areasData.reduce((s: number, a: any) => s + a.pendingCount, 0)

    res.json({
      success: true,
      data: { areas: areasData, totalOvertime, totalPending },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/tasks/all', authMiddleware, requireRole('supervisor', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { area_id, type, overtime } = req.query

    let sql = `SELECT ot.*, v.code AS vehicle_code, v.area_id AS vehicle_area_id, v.lat AS vehicle_lat, v.lng AS vehicle_lng FROM ops_tasks ot LEFT JOIN vehicles v ON ot.vehicle_id = v.id WHERE 1=1`
    const params: any[] = []

    if (area_id) {
      sql += ` AND v.area_id = ?`
      params.push(area_id)
    }
    if (type) {
      sql += ` AND ot.type = ?`
      params.push(type)
    }
    if (overtime === 'true') {
      sql += ` AND ot.status != 'completed' AND (unixepoch() - unixepoch(ot.created_at)) > 7200`
    }

    sql += ` ORDER BY ot.priority DESC, ot.created_at ASC`

    const tasks = queryAll(sql, params)
    res.json({
      success: true,
      data: tasks.map(formatTask),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

function formatTask(t: any) {
  const overtime = t.status !== 'completed' && (Date.now() - new Date(t.created_at).getTime()) > 7200000
  return {
    id: t.id,
    type: t.type,
    vehicleId: t.vehicle_id,
    vehicleCode: t.vehicle_code || null,
    vehicleAreaId: t.vehicle_area_id || null,
    vehicleLat: t.vehicle_lat ?? null,
    vehicleLng: t.vehicle_lng ?? null,
    faultType: t.fault_type,
    faultPhotos: t.fault_photos ? JSON.parse(t.fault_photos) : null,
    status: t.status,
    assignedTo: t.assigned_to,
    priority: t.priority,
    createdAt: t.created_at,
    completedAt: t.completed_at,
    repairPhotos: t.repair_photos ? JSON.parse(t.repair_photos) : null,
    overtime,
  }
}

export default router
