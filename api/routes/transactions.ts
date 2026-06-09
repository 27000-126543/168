import { Router, type Request, type Response } from 'express'
import { queryOne, queryAll, run } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

function getVehicleCode(relatedId: string | null): string | null {
  if (!relatedId) return null
  if (relatedId.startsWith('r')) {
    const rideOrder = queryOne('SELECT vehicle_id FROM ride_orders WHERE id = ?', [relatedId])
    if (rideOrder) {
      const vehicle = queryOne('SELECT code FROM vehicles WHERE id = ?', [rideOrder.vehicle_id])
      if (vehicle) return vehicle.code
    }
  }
  return null
}

function formatTransaction(t: any) {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    balanceAfter: t.balance_after,
    relatedId: t.related_id,
    description: t.description,
    status: t.status,
    createdAt: t.created_at,
    vehicleCode: getVehicleCode(t.related_id),
  }
}

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const type = req.query.type as string | undefined
    const status = req.query.status as string | undefined
    const month = req.query.month as string | undefined

    let sql = 'SELECT * FROM transactions WHERE user_id = ?'
    const params: any[] = [userId]

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (month) {
      sql += " AND strftime('%Y-%m', created_at) = ?"
      params.push(month)
    }

    sql += ' ORDER BY created_at DESC'
    const transactions = queryAll(sql, params)
    res.json({ success: true, data: transactions.map(formatTransaction) })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/export', authMiddleware, requireRole('user'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const type = req.query.type as string | undefined
    const status = req.query.status as string | undefined
    const month = req.query.month as string | undefined

    let sql = 'SELECT t.*, ro.fee AS order_fee, ro.dispatch_fee FROM transactions t LEFT JOIN ride_orders ro ON t.related_id = ro.id WHERE t.user_id = ?'
    const params: any[] = [userId]

    if (type) {
      sql += ' AND t.type = ?'
      params.push(type)
    }
    if (status) {
      sql += ' AND t.status = ?'
      params.push(status)
    }
    if (month) {
      sql += " AND strftime('%Y-%m', t.created_at) = ?"
      params.push(month)
    }

    sql += ' ORDER BY t.created_at DESC'
    const transactions = queryAll(sql, params)

    const data = transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balance_after,
      relatedId: t.related_id,
      description: t.description,
      status: t.status,
      createdAt: t.created_at,
      vehicleCode: getVehicleCode(t.related_id),
      orderFee: t.order_fee ?? null,
      dispatchFee: t.dispatch_fee ?? null,
    }))

    res.json({ success: true, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/topup', authMiddleware, requireRole('user'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const { amount } = req.body

    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: '充值金额必须大于0' })
      return
    }

    const user = queryOne('SELECT * FROM users WHERE id = ?', [userId])
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    const arrearsTransactions = queryAll(
      "SELECT * FROM transactions WHERE user_id = ? AND status = 'arrears' ORDER BY created_at ASC",
      [userId]
    )

    let remainingSettlement = amount
    let settledArrears = 0
    const now = new Date().toISOString()
    const deductionRecords: { arrearsTxId: string; deductAmount: number; remainingArrears: number }[] = []

    for (const t of arrearsTransactions) {
      if (remainingSettlement <= 0) break

      const arrearsAmount = Math.abs(t.amount)
      const currentOwed = Math.round((arrearsAmount - (t.deducted_amount || 0)) * 100) / 100

      if (currentOwed <= 0) continue

      if (remainingSettlement >= currentOwed) {
        run("UPDATE transactions SET status = 'completed' WHERE id = ?", [t.id])
        remainingSettlement -= currentOwed
        settledArrears += currentOwed
        deductionRecords.push({ arrearsTxId: t.id, deductAmount: currentOwed, remainingArrears: 0 })
      } else {
        run("UPDATE transactions SET status = 'completed' WHERE id = ?", [t.id])

        const newArrearsId = 'tx' + Date.now() + 'r'
        const remainingArrearsAmount = Math.round((currentOwed - remainingSettlement) * 100) / 100
        run(
          'INSERT INTO transactions (id, user_id, type, amount, balance_after, related_id, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [newArrearsId, userId, 'arrears', -remainingArrearsAmount, user.balance, t.related_id,
            `${t.description}（部分抵扣后剩余欠费¥${remainingArrearsAmount.toFixed(2)}）`, 'arrears', now]
        )

        settledArrears += remainingSettlement
        deductionRecords.push({ arrearsTxId: t.id, deductAmount: remainingSettlement, remainingArrears: remainingArrearsAmount })
        remainingSettlement = 0
        break
      }
    }

    const remainingTopup = remainingSettlement
    const newBalance = Math.round((user.balance + remainingTopup) * 100) / 100

    run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId])

    const txId = 'tx' + Date.now()
    const totalArrearsBefore = arrearsTransactions.reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
    const remainingArrearsTotal = Math.round((totalArrearsBefore - settledArrears) * 100) / 100
    let description: string

    if (settledArrears > 0 && remainingTopup > 0) {
      description = `余额充值${amount}元，抵扣欠费¥${settledArrears.toFixed(2)}，剩余欠费¥${remainingArrearsTotal.toFixed(2)}，到账余额¥${remainingTopup.toFixed(2)}`
    } else if (settledArrears > 0 && remainingTopup === 0) {
      description = `余额充值${amount}元，全部抵扣欠费¥${settledArrears.toFixed(2)}，剩余欠费¥${remainingArrearsTotal.toFixed(2)}，可用余额未增加`
    } else {
      description = `余额充值${amount}元`
    }

    run(
      'INSERT INTO transactions (id, user_id, type, amount, balance_after, related_id, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, userId, 'topup', amount, newBalance, null, description, 'completed', now]
    )

    res.json({
      success: true,
      data: {
        newBalance,
        settledArrears,
        topupAmount: amount,
        remainingArrears: remainingArrearsTotal,
        deductionRecords,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/arrears', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const arrears = queryAll(
      "SELECT * FROM transactions WHERE user_id = ? AND status = 'arrears'",
      [userId]
    )
    const totalArrears = arrears.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)
    res.json({
      success: true,
      data: {
        totalArrears: Math.round(totalArrears * 100) / 100,
        count: arrears.length,
        items: arrears.map(formatTransaction),
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
