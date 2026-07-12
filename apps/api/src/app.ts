import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { prisma } from './lib/prisma.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { adminRouter } from './modules/admin/admin.routes.js'

export const app = express()

app.disable('x-powered-by')

app.use(helmet())

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use('/auth', authRouter)
app.use('/admin', adminRouter)

app.get('/health/database', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`

    return response.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch {
    return response.status(503).json({
      status: 'error',
      database: 'unavailable',
      timestamp: new Date().toISOString(),
    })
  }
})