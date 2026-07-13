import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import {
  criarPeriodoSchema,
  listarPeriodosSchema,
  periodoIdSchema,
} from './periodo.schema.js'
import {
  criarPeriodo,
  fecharPeriodo,
  listarPeriodos,
  obterPeriodoAberto,
} from './periodo.service.js'

export const periodoRouter = Router()

periodoRouter.use(
  authenticate,
  authorize('arranchamento:periodo:gerenciar'),
)

periodoRouter.get('/aberto', async (_request, response) => {
  const periodo = await obterPeriodoAberto()

  return response.status(200).json({
    periodo,
  })
})

periodoRouter.get('/', async (request, response) => {
  const validacao = listarPeriodosSchema.safeParse(
    request.query,
  )

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Filtros inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const periodos = await listarPeriodos(validacao.data)

  return response.status(200).json({
    periodos,
  })
})

periodoRouter.post('/', async (request, response) => {
  const validacao = criarPeriodoSchema.safeParse(
    request.body,
  )

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const resultado = await criarPeriodo(
    validacao.data,
    request.auth!.usuarioId,
  )

  if (!resultado.sucesso) {
    if (resultado.motivo === 'PERIODO_ABERTO_EXISTENTE') {
      return response.status(409).json({
        erro: 'Já existe um período de arranchamento aberto.',
      })
    }

    return response.status(409).json({
      erro: 'Já existe um período para essas datas.',
    })
  }

  return response.status(201).json({
    periodo: resultado.periodo,
  })
})

periodoRouter.patch(
  '/:id/fechar',
  async (request, response) => {
    const id = periodoIdSchema.safeParse(request.params.id)

    if (!id.success) {
      return response.status(400).json({
        erro: 'Identificador inválido.',
      })
    }

    const resultado = await fecharPeriodo(
      id.data,
      request.auth!.usuarioId,
    )

    if (!resultado.sucesso) {
      if (resultado.motivo === 'NAO_ENCONTRADO') {
        return response.status(404).json({
          erro: 'Período não encontrado.',
        })
      }

      return response.status(409).json({
        erro: 'O período já está fechado.',
      })
    }

    return response.status(200).json({
      periodo: resultado.periodo,
    })
  },
)