import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'

export const adminRouter = Router()

adminRouter.get(
  '/status',
  authenticate,
  authorize('usuario:gerenciar'),
  (request, response) => {
    return response.status(200).json({
      status: 'ok',
      modulo: 'administracao',
      usuarioId: request.auth?.usuarioId,
      mensagem: 'Acesso administrativo autorizado.',
    })
  },
)