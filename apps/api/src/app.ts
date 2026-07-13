import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { prisma } from './lib/prisma.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { feriasRouter } from './modules/ferias/ferias.routes.js'
import { militarRouter } from './modules/militares/militar.routes.js'
import { subunidadeRouter } from './modules/subunidades/subunidade.routes.js'
import { periodoRouter } from './modules/periodos/periodo.routes.js'

export const app = express()

app.disable('x-powered-by')

app.use(helmet())
app.use(cookieParser())

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use('/auth', authRouter)
app.use('/subunidades', subunidadeRouter)
app.use('/militares', militarRouter)
app.use('/ferias', feriasRouter)
app.use('/admin', adminRouter)
app.use('/periodos', periodoRouter)

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