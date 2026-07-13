import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import { salvarConfiguracaoOmSchema } from './configuracao-om.schema.js'
import {
  obterConfiguracaoOm,
  salvarConfiguracaoOm,
} from './configuracao-om.service.js'

export const configuracaoOmRouter = Router()

configuracaoOmRouter.get(
  '/',
  authenticate,
  async (_request, response) => {
    const configuracao = await obterConfiguracaoOm()

    return response.status(200).json({
      configuracao,
    })
  },
)

configuracaoOmRouter.put(
  '/',
  authenticate,
  authorize('usuario:gerenciar'),
  async (request, response) => {
    const validacao = salvarConfiguracaoOmSchema.safeParse(
      request.body,
    )

    if (!validacao.success) {
      return response.status(400).json({
        erro: 'Dados inválidos.',
        detalhes: validacao.error.flatten().fieldErrors,
      })
    }

    const configuracao = await salvarConfiguracaoOm(
      validacao.data,
      request.auth!.usuarioId,
    )

    return response.status(200).json({
      configuracao,
      mensagem: 'Configurações da OM atualizadas com sucesso.',
    })
  },
)