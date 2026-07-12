import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import {
  atualizarSubunidadeSchema,
  criarSubunidadeSchema,
  subunidadeIdSchema,
} from './subunidade.schema.js'
import {
  atualizarSubunidade,
  criarSubunidade,
  listarSubunidades,
} from './subunidade.service.js'

export const subunidadeRouter = Router()

subunidadeRouter.use(
  authenticate,
  authorize('militar:gerenciar'),
)

subunidadeRouter.get('/', async (_request, response) => {
  const subunidades = await listarSubunidades()

  return response.status(200).json({
    subunidades,
  })
})

subunidadeRouter.post('/', async (request, response) => {
  const validacao = criarSubunidadeSchema.safeParse(
    request.body,
  )

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const resultado = await criarSubunidade(validacao.data)

  if (!resultado.sucesso) {
    return response.status(409).json({
      erro: 'Já existe uma subunidade com essa sigla.',
    })
  }

  return response.status(201).json({
    subunidade: resultado.subunidade,
  })
})

subunidadeRouter.patch('/:id', async (request, response) => {
  const id = subunidadeIdSchema.safeParse(request.params.id)
  const dados = atualizarSubunidadeSchema.safeParse(
    request.body,
  )

  if (!id.success || !dados.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
    })
  }

  const resultado = await atualizarSubunidade(
    id.data,
    dados.data,
  )

  if (!resultado.sucesso) {
    if (resultado.motivo === 'NAO_ENCONTRADA') {
      return response.status(404).json({
        erro: 'Subunidade não encontrada.',
      })
    }

    return response.status(409).json({
      erro: 'Já existe uma subunidade com essa sigla.',
    })
  }

  return response.status(200).json({
    subunidade: resultado.subunidade,
  })
})