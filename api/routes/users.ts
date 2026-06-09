import { Router, type Request, type Response } from 'express'
import { queryOne, queryAll, run } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const users = queryAll('SELECT * FROM users ORDER BY role, id')
    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        creditScore: u.credit_score,
        balance: u.balance,
        deposit: u.deposit,
        areaId: u.area_id,
        createdAt: u.created_at,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/', authMiddleware, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, name, password, role, areaId } = req.body
    if (!name || !role || !password) {
      res.status(400).json({ success: false, error: '请提供必要信息' })
      return
    }
    const id = 'u' + Date.now()
    const now = new Date().toISOString()
    run(
      'INSERT INTO users (id, phone, name, password, role, credit_score, balance, deposit, area_id, created_at) VALUES (?, ?, ?, ?, ?, 100, 0, 0, ?, ?)',
      [id, phone || null, name, password, role, areaId || null, now]
    )
    res.json({ success: true, data: { id, name, role } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id])
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    if (req.user!.role !== 'admin' && req.user!.id !== req.params.id) {
      res.status(403).json({ success: false, error: '权限不足' })
      return
    }

    const { name, phone, password, creditScore, areaId } = req.body
    const updates: string[] = []
    const params: any[] = []

    if (name !== undefined) { updates.push('name = ?'); params.push(name) }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone) }
    if (password !== undefined) { updates.push('password = ?'); params.push(password) }
    if (creditScore !== undefined && req.user!.role === 'admin') { updates.push('credit_score = ?'); params.push(creditScore) }
    if (areaId !== undefined) { updates.push('area_id = ?'); params.push(areaId) }

    if (updates.length > 0) {
      params.push(req.params.id)
      run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
    }

    res.json({ success: true, data: { id: req.params.id } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/faults/report', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId, faultType, photos } = req.body
    const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [vehicleId])
    if (!vehicle) {
      res.status(404).json({ success: false, error: '车辆不存在' })
      return
    }

    const taskId = 'ot' + Date.now()
    const now = new Date().toISOString()
    const opsUsers = queryAll("SELECT * FROM users WHERE role = 'ops'")
    let assignedTo: string | null = null

    if (opsUsers.length > 0) {
      const vehicleArea = vehicle.area_id
      const matchedOps = opsUsers.find((u: any) => u.area_id === vehicleArea)
      assignedTo = matchedOps ? matchedOps.id : opsUsers[0].id
    }

    run(
      'INSERT INTO ops_tasks (id, type, vehicle_id, fault_type, fault_photos, status, assigned_to, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, 'repair', vehicleId, faultType, photos ? JSON.stringify(photos) : null, 'pending', assignedTo, 3, now]
    )

    run("UPDATE vehicles SET status = 'fault' WHERE id = ?", [vehicleId])

    if (assignedTo) {
      run(
        'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
        ['n' + Date.now(), assignedTo, 'dispatch', '新维修任务', `车辆 ${vehicle.code} 报告故障：${faultType}，请及时处理`, taskId]
      )
    }

    run(
      'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['n' + Date.now() + 'u', req.user!.id, 'fault', '故障报告已提交', `您报告的车辆 ${vehicle.code} 故障已受理，我们将尽快处理`, vehicleId]
    )

    res.json({
      success: true,
      data: { taskId, assignedTo, message: '故障已提交' },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
