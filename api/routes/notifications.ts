import { Router, type Request, type Response } from 'express'
import { queryOne, queryAll, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const notifications = queryAll(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.user!.id]
    )
    res.json({
      success: true,
      data: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        read: !!n.read,
        createdAt: n.created_at,
        relatedId: n.related_id,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = queryOne('SELECT * FROM notifications WHERE id = ?', [req.params.id])
    if (!notification) {
      res.status(404).json({ success: false, error: '通知不存在' })
      return
    }
    if (notification.user_id !== req.user!.id) {
      res.status(403).json({ success: false, error: '无权操作此通知' })
      return
    }
    run('UPDATE notifications SET read = 1 WHERE id = ?', [req.params.id])
    res.json({ success: true, data: { id: req.params.id, read: true } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, type, title, content, relatedId } = req.body
    const id = 'n' + Date.now()
    const now = new Date().toISOString()
    run(
      'INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, type, title, content, relatedId || null]
    )
    res.json({ success: true, data: { id } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
