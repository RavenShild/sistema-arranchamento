import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import {
  criarEscalaSchema,
  escalaIdSchema,
} from './escala.schema.js'
import {
  criarEscala,
  excluirEscala,
  obterContextoEscala,
  obterEscopoEscala,
} from './escala.service.js'

export const escalaRouter = Router()

escalaRouter.use(
  authenticate,
  authorize('escala:servico:gerenciar'),
)

async function resolverEscopo(
  usuarioId: number,
  permissoes: string[],
) {
  return obterEscopoEscala(usuarioId, permissoes)
}

escalaRouter.get('/contexto', async (request, response) => {
  const escopo = await resolverEscopo(
    request.auth!.usuarioId,
    request.auth!.permissoes,
  )

  if (!escopo.sucesso) {
    return response.status(403).json({
      erro: 'Não foi possível determinar sua subunidade.',
    })
  }

  const contexto = await obterContextoEscala(
    escopo.subunidadeId,
  )

  return response.status(200).json(contexto)
})

escalaRouter.post('/', async (request, response) => {
  const validacao = criarEscalaSchema.safeParse(request.body)

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const escopo = await resolverEscopo(
    request.auth!.usuarioId,
    request.auth!.permissoes,
  )

  if (!escopo.sucesso) {
    return response.status(403).json({
      erro: 'Não foi possível determinar sua subunidade.',
    })
  }

  const resultado = await criarEscala(
    validacao.data,
    request.auth!.usuarioId,
    escopo.subunidadeId,
  )

  if (!resultado.sucesso) {
    const respostas = {
      PERIODO_NAO_ENCONTRADO: {
        status: 409,
        erro: 'Não existe período de arranchamento aberto.',
      },
      DATA_FORA_DO_PERIODO: {
        status: 400,
        erro: 'A data informada está fora do período aberto.',
      },
      MILITAR_NAO_ENCONTRADO: {
        status: 404,
        erro: 'Militar não encontrado.',
      },
      MILITAR_INATIVO: {
        status: 409,
        erro: 'O militar não está na situação ATIVO.',
      },
      MILITAR_EM_FERIAS: {
        status: 409,
        erro: 'O militar está de férias na data informada.',
      },
      ESCALA_EXISTENTE: {
        status: 409,
        erro: 'O militar já está na GU de serviço nessa data.',
      },
    } as const

    const resposta = respostas[resultado.motivo]

    return response.status(resposta.status).json({
      erro: resposta.erro,
    })
  }

  return response.status(201).json({
    escala: resultado.escala,
  })
})

escalaRouter.delete('/:id', async (request, response) => {
  const id = escalaIdSchema.safeParse(request.params.id)

  if (!id.success) {
    return response.status(400).json({
      erro: 'Identificador inválido.',
    })
  }

  const escopo = await resolverEscopo(
    request.auth!.usuarioId,
    request.auth!.permissoes,
  )

  if (!escopo.sucesso) {
    return response.status(403).json({
      erro: 'Não foi possível determinar sua subunidade.',
    })
  }

  const resultado = await excluirEscala(
    id.data,
    escopo.subunidadeId,
  )

  if (!resultado.sucesso) {
    if (resultado.motivo === 'NAO_ENCONTRADA') {
      return response.status(404).json({
        erro: 'Registro da escala não encontrado.',
      })
    }

    return response.status(409).json({
      erro: 'Não é possível alterar uma escala de período fechado.',
    })
  }

  return response.status(204).send()
})