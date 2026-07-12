import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import {
  atualizarFeriasSchema,
  criarFeriasSchema,
  feriasIdSchema,
  listarFeriasSchema,
} from './ferias.schema.js'
import {
  atualizarFerias,
  criarFerias,
  excluirFerias,
  listarFerias,
  listarMilitaresParaFerias,
} from './ferias.service.js'

export const feriasRouter = Router()

feriasRouter.use(
  authenticate,
  authorize('ferias:gerenciar'),
)

feriasRouter.get('/militares', async (_request, response) => {
  const militares = await listarMilitaresParaFerias()

  return response.status(200).json({
    militares,
  })
})

feriasRouter.get('/', async (request, response) => {
  const validacao = listarFeriasSchema.safeParse(
    request.query,
  )

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Filtros inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const ferias = await listarFerias(validacao.data)

  return response.status(200).json({
    ferias,
  })
})

feriasRouter.post('/', async (request, response) => {
  const validacao = criarFeriasSchema.safeParse(
    request.body,
  )

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const resultado = await criarFerias(
    validacao.data,
    request.auth!.usuarioId,
  )

  if (!resultado.sucesso) {
    if (resultado.motivo === 'MILITAR_NAO_ENCONTRADO') {
      return response.status(404).json({
        erro: 'Militar não encontrado.',
      })
    }

    return response.status(409).json({
      erro: 'O militar já possui férias nesse período.',
    })
  }

  return response.status(201).json({
    ferias: resultado.ferias,
  })
})

feriasRouter.patch('/:id', async (request, response) => {
  const id = feriasIdSchema.safeParse(request.params.id)
  const dados = atualizarFeriasSchema.safeParse(
    request.body,
  )

  if (!id.success || !dados.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: dados.success
        ? undefined
        : dados.error.flatten().fieldErrors,
    })
  }

  const resultado = await atualizarFerias(
    id.data,
    dados.data,
  )

  if (!resultado.sucesso) {
    if (resultado.motivo === 'NAO_ENCONTRADO') {
      return response.status(404).json({
        erro: 'Período de férias não encontrado.',
      })
    }

    if (resultado.motivo === 'MILITAR_NAO_ENCONTRADO') {
      return response.status(404).json({
        erro: 'Militar não encontrado.',
      })
    }

    if (resultado.motivo === 'PERIODO_INVALIDO') {
      return response.status(400).json({
        erro:
          'A data final deve ser igual ou posterior à inicial.',
      })
    }

    return response.status(409).json({
      erro: 'O militar já possui férias nesse período.',
    })
  }

  return response.status(200).json({
    ferias: resultado.ferias,
  })
})

feriasRouter.delete('/:id', async (request, response) => {
  const id = feriasIdSchema.safeParse(request.params.id)

  if (!id.success) {
    return response.status(400).json({
      erro: 'Identificador inválido.',
    })
  }

  const resultado = await excluirFerias(id.data)

  if (!resultado.sucesso) {
    if (resultado.motivo === 'NAO_ENCONTRADO') {
      return response.status(404).json({
        erro: 'Período de férias não encontrado.',
      })
    }

    return response.status(409).json({
      erro:
        'Férias iniciadas ou encerradas não podem ser excluídas.',
    })
  }

  return response.status(204).send()
})