import { Router, type Request, type Response } from 'express'
import { queryOne, queryAll, run } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

let weatherConfig: any = {
  condition: 'sunny',
  multiplier: 1.0,
  configs: [
    { condition: 'sunny', multiplier: 1.0, label: '晴天' },
    { condition: 'cloudy', multiplier: 1.0, label: '多云' },
    { condition: 'rainy', multiplier: 1.2, label: '雨天' },
    { condition: 'heavy_rain', multiplier: 1.5, label: '暴雨' },
    { condition: 'snow', multiplier: 1.3, label: '雪天' },
  ],
}

router.get('/rules', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const rules = queryAll('SELECT * FROM pricing_rules ORDER BY created_at')
    res.json({
      success: true,
      data: rules.map(r => ({
        id: r.id,
        name: r.name,
        timeSlots: JSON.parse(r.time_slots),
        weatherAdjustments: r.weather_adjustments ? JSON.parse(r.weather_adjustments) : null,
        active: !!r.active,
        createdAt: r.created_at,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/rules', authMiddleware, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, timeSlots, weatherAdjustments } = req.body
    const id = 'pr' + Date.now()
    const now = new Date().toISOString()

    run(
      'INSERT INTO pricing_rules (id, name, time_slots, weather_adjustments, active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [id, name, JSON.stringify(timeSlots), weatherAdjustments ? JSON.stringify(weatherAdjustments) : null, now]
    )

    res.json({ success: true, data: { id, name } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/rules/:id', authMiddleware, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const rule = queryOne('SELECT * FROM pricing_rules WHERE id = ?', [req.params.id])
    if (!rule) {
      res.status(404).json({ success: false, error: '计价规则不存在' })
      return
    }

    const { name, timeSlots, weatherAdjustments, active } = req.body
    const updates: string[] = []
    const params: any[] = []

    if (name !== undefined) { updates.push('name = ?'); params.push(name) }
    if (timeSlots !== undefined) { updates.push('time_slots = ?'); params.push(JSON.stringify(timeSlots)) }
    if (weatherAdjustments !== undefined) { updates.push('weather_adjustments = ?'); params.push(JSON.stringify(weatherAdjustments)) }
    if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0) }

    if (updates.length > 0) {
      params.push(req.params.id)
      run(`UPDATE pricing_rules SET ${updates.join(', ')} WHERE id = ?`, params)
    }

    res.json({ success: true, data: { id: req.params.id } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/weather', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: weatherConfig })
})

router.put('/weather', authMiddleware, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  const { condition, multiplier } = req.body
  if (condition) weatherConfig.condition = condition
  if (multiplier !== undefined) weatherConfig.multiplier = multiplier
  res.json({ success: true, data: weatherConfig })
})

router.post('/calculate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { distance, duration, startTime } = req.body

    const start = startTime ? new Date(startTime) : new Date()
    const hour = start.getHours()
    let ruleName: string
    if (hour >= 7 && hour < 9) ruleName = '早高峰'
    else if (hour >= 9 && hour < 17) ruleName = '平峰'
    else if (hour >= 17 && hour < 19) ruleName = '晚高峰'
    else ruleName = '夜间'

    const rule = queryOne('SELECT * FROM pricing_rules WHERE name = ? AND active = 1', [ruleName])
    if (!rule) {
      res.status(404).json({ success: false, error: '未找到适用的计价规则' })
      return
    }

    const timeSlots = JSON.parse(rule.time_slots)
    const slot = timeSlots[0]
    const basePrice = slot.basePrice || 2
    const timeRate = slot.timeRate || 1
    const distanceRate = slot.distanceRate || 0.5

    const durationUnits = Math.ceil(duration / 15)
    const distanceFee = distance * distanceRate
    let fee = basePrice + Math.max(0, durationUnits - 1) * timeRate + distanceFee

    const weatherMultiplier = weatherConfig.multiplier
    fee = fee * weatherMultiplier

    res.json({
      success: true,
      data: {
        ruleName,
        basePrice,
        timeRate,
        distanceRate,
        durationUnits: Math.max(0, durationUnits - 1),
        distanceFee: Math.round(distanceFee * 100) / 100,
        subtotal: Math.round(fee / weatherMultiplier * 100) / 100,
        weatherMultiplier,
        totalFee: Math.round(fee * 100) / 100,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
