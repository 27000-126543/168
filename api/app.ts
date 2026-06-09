import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDatabase } from './db.js'
import authRoutes from './routes/auth.js'
import vehicleRoutes from './routes/vehicles.js'
import rideRoutes from './routes/rides.js'
import opsRoutes from './routes/ops.js'
import statsRoutes from './routes/stats.js'
import pricingRoutes from './routes/pricing.js'
import notificationRoutes from './routes/notifications.js'
import reportRoutes from './routes/reports.js'
import userRoutes from './routes/users.js'
import transactionRoutes from './routes/transactions.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

let dbReady = false

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!dbReady) {
    res.status(503).json({ success: false, error: '服务初始化中，请稍后重试' })
    return
  }
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/rides', rideRoutes)
app.use('/api/ops', opsRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/pricing', pricingRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/users', userRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/faults', userRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
      dbReady,
    })
  },
)

app.use(express.static(path.join(__dirname, '..', 'dist')))

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export async function startApp() {
  await initDatabase()
  dbReady = true
  console.log('App initialized and ready')
}

export default app
