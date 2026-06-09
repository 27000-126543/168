import { Router, type Request, type Response } from 'express'
import { queryOne } from '../db.js'
import { authMiddleware, generateToken } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code, username, password } = req.body
    let user: any = null

    if (phone && code) {
      if (code !== '123456') {
        res.status(400).json({ success: false, error: '验证码错误' })
        return
      }
      user = queryOne("SELECT * FROM users WHERE phone = ? AND role = 'user'", [phone])
    } else if (username && password) {
      user = queryOne('SELECT * FROM users WHERE name = ? AND password = ?', [username, password])
    } else {
      res.status(400).json({ success: false, error: '请提供手机号+验证码或用户名+密码' })
      return
    }

    if (!user) {
      res.status(401).json({ success: false, error: '账号或密码错误' })
      return
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
    })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          phone: user.phone,
          creditScore: user.credit_score,
          balance: user.balance,
          deposit: user.deposit,
          areaId: user.area_id,
        },
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user!.id])
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        creditScore: user.credit_score,
        balance: user.balance,
        deposit: user.deposit,
        areaId: user.area_id,
        createdAt: user.created_at,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
