import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import { salvarArranchamentoSchema } from './arranchamento.schema.js'
import {
  obterMeuArranchamento,
  salvarMeuArranchamento,
} from './arranchamento.service.js'

export const arranchamentoRouter = Router()

arranchamentoRouter.use(authenticate)

arranchamentoRouter.get(
  '/meu',
  authorize('refeicao:ler'),
  async (request, response) => {
    const resultado = await obterMeuArranchamento(
      request.auth!.usuarioId,
    )

    if (!resultado.sucesso) {
      return response.status(404).json({
        erro: 'Usuário militar não encontrado.',
      })
    }

    return response.status(200).json(resultado)
  },
)

arranchamentoRouter.put(
  '/meu',
  authorize('arranchamento:proprio:criar'),
  async (request, response) => {
    const validacao = salvarArranchamentoSchema.safeParse(
      request.body,
    )

    if (!validacao.success) {
      return response.status(400).json({
        erro: 'Dados inválidos.',
        detalhes: validacao.error.flatten().fieldErrors,
      })
    }

    const resultado = await salvarMeuArranchamento(
      request.auth!.usuarioId,
      validacao.data,
    )

    if (!resultado.sucesso) {
      const respostas = {
        USUARIO_NAO_ENCONTRADO: {
          status: 404,
          erro: 'Usuário militar não encontrado.',
        },
        MILITAR_INATIVO: {
          status: 409,
          erro: 'A situação atual do militar não permite arranchamento.',
        },
        PERIODO_NAO_ENCONTRADO: {
          status: 409,
          erro: 'Não existe período de arranchamento aberto.',
        },
        DATA_FORA_DO_PERIODO: {
          status: 400,
          erro: 'Existe uma data fora do período aberto.',
        },
        DATA_GU_SERVICO: {
          status: 409,
          erro: 'A GU de serviço já possui arranchamento automático.',
        },
        FERIAS_NAO_LARANJEIRA: {
          status: 409,
          erro: 'Militar não laranjeira não pode se arranchar durante as férias.',
        },
      } as const

      const resposta = respostas[resultado.motivo]

      return response.status(resposta.status).json({
        erro: resposta.erro,
      })
    }

    return response.status(200).json({
      mensagem: 'Arranchamento atualizado com sucesso.',
      quantidade: resultado.quantidade,
    })
  },
)