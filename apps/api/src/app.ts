import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

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

app.get('/health', (_request, response) => {
  return response.status(200).json({
    status: 'ok',
    service: 'arranchamento-api',
    timestamp: new Date().toISOString(),
  })
})