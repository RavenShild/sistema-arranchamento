import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { prisma } from './lib/prisma.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { configuracaoOmRouter } from './modules/configuracao.om/configuracao-om.routes.js'
import { feriasRouter } from './modules/ferias/ferias.routes.js'
import { militarRouter } from './modules/militares/militar.routes.js'
import { subunidadeRouter } from './modules/subunidades/subunidade.routes.js'
import { periodoRouter } from './modules/periodos/periodo.routes.js'
import { escalaRouter } from './modules/escalas/escala.routes.js'
import { arranchamentoRouter } from './modules/arranchamentos/arranchamento.route.js'
import { relatorioRouter } from './modules/relatorios/relatorio.routes.js'
import { usuarioRouter } from './modules/usuarios/usuario.routes.js'
import { feriadoRouter } from './modules/feriados/feriado.routes.js'


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
app.use('/configuracao-om', configuracaoOmRouter)
app.use('/subunidades', subunidadeRouter)
app.use('/militares', militarRouter)
app.use('/ferias', feriasRouter)
app.use('/admin', adminRouter)
app.use('/periodos', periodoRouter)
app.use('/escalas', escalaRouter)
app.use('/arranchamentos', arranchamentoRouter)
app.use('/relatorios', relatorioRouter)
app.use('/usuarios', usuarioRouter)
app.use('/feriados', feriadoRouter)

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