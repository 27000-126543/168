import { Router, type Request, type Response } from 'express'
import { queryOne, queryAll, run } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

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
  }
}

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const type = req.query.type as string | undefined
    let transactions: any[]
    if (type) {
      transactions = queryAll(
        'SELECT * FROM transactions WHERE user_id = ? AND type = ? ORDER BY created_at DESC',
        [userId, type]
      )
    } else {
      transactions = queryAll(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      )
    }
    res.json({ success: true, data: transactions.map(formatTransaction) })
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

    for (const t of arrearsTransactions) {
      const arrearsAmount = Math.abs(t.amount)
      if (remainingSettlement >= arrearsAmount) {
        run("UPDATE transactions SET status = 'completed' WHERE id = ?", [t.id])
        remainingSettlement -= arrearsAmount
        settledArrears += arrearsAmount
      } else {
        break
      }
    }

    const remainingTopup = remainingSettlement
    const newBalance = Math.round((user.balance + remainingTopup) * 100) / 100

    run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId])

    const txId = 'tx' + Date.now()
    const now = new Date().toISOString()
    const description = settledArrears > 0
      ? `余额充值${amount}元（含抵扣欠费${settledArrears}元）`
      : `余额充值${amount}元`

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
