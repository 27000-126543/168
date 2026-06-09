import { Router, type Request, type Response } from 'express'
import { queryOne, queryAll, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function isInParkingFence(lat: number, lng: number): boolean {
  const fences = queryAll("SELECT * FROM electronic_fences WHERE type = 'parking'")
  for (const fence of fences) {
    const polygon = JSON.parse(fence.polygon_coords)
    if (pointInPolygon(lat, lng, polygon)) return true
  }
  return false
}

function getCurrentPricingRule(): any {
  const hour = new Date().getHours()
  let ruleName: string
  if (hour >= 7 && hour < 9) ruleName = '早高峰'
  else if (hour >= 9 && hour < 17) ruleName = '平峰'
  else if (hour >= 17 && hour < 19) ruleName = '晚高峰'
  else ruleName = '夜间'

  return queryOne('SELECT * FROM pricing_rules WHERE name = ? AND active = 1', [ruleName])
}

function calculateFee(distance: number, durationMin: number, pricingRule: any): number {
  const timeSlots = JSON.parse(pricingRule.time_slots)
  const slot = timeSlots[0]
  if (!slot) return 0

  const basePrice = slot.basePrice || 2
  const timeRate = slot.timeRate || 1
  const distanceRate = slot.distanceRate || 0.5

  const durationUnits = Math.ceil(durationMin / 15)
  const distanceFee = distance * distanceRate
  let fee = basePrice + Math.max(0, durationUnits - 1) * timeRate + distanceFee
  return Math.round(fee * 100) / 100
}

router.post('/unlock', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { vehicleId, paidDeposit } = req.body
    const userId = req.user!.id

    const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [vehicleId])
    if (!vehicle) {
      res.status(404).json({ success: false, error: '车辆不存在' })
      return
    }
    if (vehicle.status !== 'available') {
      res.status(400).json({ success: false, error: '车辆不可用' })
      return
    }

    const user = queryOne('SELECT * FROM users WHERE id = ?', [userId])
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    const needDeposit = user.credit_score < 60 && user.deposit < 199
    if (needDeposit && !paidDeposit) {
      res.json({
        success: true,
        data: {
          orderId: null,
          needDeposit: true,
          depositAmount: 199,
          vehicleCode: vehicle.code,
          message: '信用分不足，请先缴纳押金',
        },
      })
      return
    }

    if (needDeposit && paidDeposit) {
      run('UPDATE users SET deposit = 199 WHERE id = ?', [userId])
    }

    const orderId = 'r' + Date.now()
    const now = new Date().toISOString()
    run(
      'INSERT INTO ride_orders (id, user_id, vehicle_id, start_time, start_lat, start_lng, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [orderId, userId, vehicleId, now, vehicle.lat, vehicle.lng, 'riding']
    )
    run("UPDATE vehicles SET status = 'riding' WHERE id = ?", [vehicleId])

    run(
      'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['n' + Date.now(), userId, 'unlock', '开锁成功', `您已成功解锁车辆 ${vehicle.code}，祝您骑行愉快`, orderId]
    )

    res.json({
      success: true,
      data: {
        orderId,
        needDeposit: false,
        depositAmount: 0,
        vehicleCode: vehicle.code,
        startTime: now,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/track', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng } = req.body
    const orderId = req.params.id

    const order = queryOne('SELECT * FROM ride_orders WHERE id = ?', [orderId])
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: '无权操作此订单' })
      return
    }

    const trackId = 't' + Date.now()
    const now = new Date().toISOString()
    run('INSERT INTO ride_tracks (id, order_id, lat, lng, reported_at) VALUES (?, ?, ?, ?, ?)', [trackId, orderId, lat, lng, now])

    res.json({ success: true, data: { trackId } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/return', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng } = req.body
    const orderId = req.params.id

    const order = queryOne('SELECT * FROM ride_orders WHERE id = ?', [orderId])
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.status !== 'riding') {
      res.status(400).json({ success: false, error: '订单状态异常' })
      return
    }

    const inFence = isInParkingFence(lat, lng)
    const now = new Date().toISOString()
    const startTime = new Date(order.start_time)
    const durationMin = Math.round((Date.now() - startTime.getTime()) / 60000)
    const distance = Math.round(Math.sqrt(
      (lat - order.start_lat) ** 2 + (lng - order.start_lng) ** 2
    ) * 111 * 10) / 10

    const pricingRule = getCurrentPricingRule()
    let fee = calculateFee(distance, durationMin, pricingRule)

    let dispatchFee = 0
    let creditDeducted = 0
    if (!inFence) {
      dispatchFee = 15
      creditDeducted = 5
    }

    const totalFee = Math.round((fee + dispatchFee) * 100) / 100

    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user!.id])
    const currentBalance = user ? user.balance : 0
    const currentCredit = user ? user.credit_score : 100
    const balanceInsufficient = currentBalance < totalFee
    const newBalance = balanceInsufficient ? currentBalance : Math.round((currentBalance - totalFee) * 100) / 100

    if (!balanceInsufficient) {
      run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, req.user!.id])
    }

    let newCreditScore = currentCredit
    if (creditDeducted > 0) {
      newCreditScore = Math.max(0, currentCredit - creditDeducted)
      run('UPDATE users SET credit_score = ? WHERE id = ?', [newCreditScore, req.user!.id])
    }

    run(
      'UPDATE ride_orders SET end_time=?, end_lat=?, end_lng=?, distance=?, duration=?, fee=?, dispatch_fee=?, credit_deducted=?, in_fence=?, status=? WHERE id=?',
      [now, lat, lng, distance, durationMin, fee, dispatchFee, creditDeducted, inFence ? 1 : 0, 'completed', orderId]
    )

    const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [order.vehicle_id])
    let newBattery = vehicle ? vehicle.battery : 100
    newBattery = Math.max(0, newBattery - Math.round(distance * 2))
    const newStatus = newBattery <= 20 ? 'low_battery' : 'available'
    run('UPDATE vehicles SET status=?, lat=?, lng=?, battery=?, last_report_time=? WHERE id=?',
      [newStatus, lat, lng, newBattery, now, order.vehicle_id])

    let notifyContent = ''
    if (balanceInsufficient) {
      notifyContent = inFence
        ? `您已归还车辆，本次费用${totalFee}元。账户余额不足（余额${currentBalance.toFixed(2)}元），请及时充值。`
        : `您在电子围栏外还车，加收调度费15元，扣信用分5分，本次费用${totalFee}元。账户余额不足（余额${currentBalance.toFixed(2)}元），欠费将记入待还款。`
    } else {
      notifyContent = inFence
        ? `您已成功归还车辆，本次骑行费用${totalFee}元已从余额扣除，余额${newBalance.toFixed(2)}元。`
        : `您在电子围栏外还车，加收调度费15元，扣信用分5分，本次费用${totalFee}元已从余额扣除，余额${newBalance.toFixed(2)}元。`
    }

    run(
      'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['n' + Date.now(), req.user!.id, 'return',
        inFence ? '还车成功' : '还车提醒',
        notifyContent,
        orderId]
    )

    res.json({
      success: true,
      data: {
        orderId,
        fee,
        dispatchFee,
        totalFee,
        distance,
        duration: durationMin,
        inFence,
        creditDeducted,
        newBattery,
        balanceInsufficient,
        newBalance,
        newCreditScore,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/history', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = queryAll(
      'SELECT * FROM ride_orders WHERE user_id = ? ORDER BY start_time DESC',
      [req.user!.id]
    )
    res.json({
      success: true,
      data: orders.map(o => ({
        id: o.id,
        vehicleId: o.vehicle_id,
        startTime: o.start_time,
        endTime: o.end_time,
        startLat: o.start_lat,
        startLng: o.start_lng,
        endLat: o.end_lat,
        endLng: o.end_lng,
        distance: o.distance,
        duration: o.duration,
        fee: o.fee,
        dispatchFee: o.dispatch_fee,
        inFence: !!o.in_fence,
        status: o.status,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const order = queryOne('SELECT * FROM ride_orders WHERE id = ?', [req.params.id])
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    const tracks = queryAll('SELECT * FROM ride_tracks WHERE order_id = ?', [req.params.id])
    const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [order.vehicle_id])

    res.json({
      success: true,
      data: {
        id: order.id,
        userId: order.user_id,
        vehicleId: order.vehicle_id,
        vehicleCode: vehicle?.code || '',
        startTime: order.start_time,
        endTime: order.end_time,
        startLat: order.start_lat,
        startLng: order.start_lng,
        endLat: order.end_lat,
        endLng: order.end_lng,
        distance: order.distance,
        duration: order.duration,
        fee: order.fee,
        dispatchFee: order.dispatch_fee,
        creditDeducted: order.credit_deducted,
        inFence: !!order.in_fence,
        status: order.status,
        tracks: tracks.map(t => ({ lat: t.lat, lng: t.lng, reportedAt: t.reported_at })),
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
