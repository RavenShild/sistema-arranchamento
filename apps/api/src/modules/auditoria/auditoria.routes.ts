import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import { listarAuditoriasSchema } from './auditoria.schema.js'
import { listarAuditorias } from './auditoria.service.js'

export const auditoriaRouter = Router()

auditoriaRouter.get(
  '/',
  authenticate,
  authorize('usuario:gerenciar'),
  async (request, response) => {
    const validacao = listarAuditoriasSchema.safeParse(request.query)

    if (!validacao.success) {
      return response.status(400).json({
        erro: 'Filtros inválidos.',
        detalhes: validacao.error.flatten().fieldErrors,
      })
    }

    const resultado = await listarAuditorias(validacao.data)

    return response.status(200).json(resultado)
  },
)