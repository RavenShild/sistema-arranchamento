import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import {
  atualizarMilitarSchema,
  criarMilitarSchema,
  listarMilitaresSchema,
  militarIdSchema,
} from './militar.schema.js'
import {
  atualizarMilitar,
  criarMilitar,
  listarMilitares,
  obterMilitar,
} from './militar.service.js'

export const militarRouter = Router()

militarRouter.use(
  authenticate,
  authorize('militar:gerenciar'),
)

militarRouter.get('/', async (request, response) => {
  const validacao = listarMilitaresSchema.safeParse(
    request.query,
  )

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Filtros inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const militares = await listarMilitares(validacao.data)

  return response.status(200).json({
    militares,
  })
})

militarRouter.get('/:id', async (request, response) => {
  const id = militarIdSchema.safeParse(request.params.id)

  if (!id.success) {
    return response.status(400).json({
      erro: 'Identificador inválido.',
    })
  }

  const militar = await obterMilitar(id.data)

  if (!militar) {
    return response.status(404).json({
      erro: 'Militar não encontrado.',
    })
  }

  return response.status(200).json({
    militar,
  })
})

militarRouter.post('/', async (request, response) => {
  const validacao = criarMilitarSchema.safeParse(
    request.body,
  )

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const resultado = await criarMilitar(validacao.data)

  if (!resultado.sucesso) {
    if (resultado.motivo === 'IDENTIDADE_EXISTENTE') {
      return response.status(409).json({
        erro: 'Já existe um militar com essa identidade.',
      })
    }

    if (resultado.motivo === 'SUBUNIDADE_INATIVA') {
      return response.status(409).json({
        erro: 'A subunidade selecionada está inativa.',
      })
    }

    return response.status(404).json({
      erro: 'Subunidade não encontrada.',
    })
  }

  return response.status(201).json({
    militar: resultado.militar,
  })
})

militarRouter.patch('/:id', async (request, response) => {
  const id = militarIdSchema.safeParse(request.params.id)
  const dados = atualizarMilitarSchema.safeParse(
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

  const resultado = await atualizarMilitar(
    id.data,
    dados.data,
  )

  if (!resultado.sucesso) {
    if (resultado.motivo === 'NAO_ENCONTRADO') {
      return response.status(404).json({
        erro: 'Militar não encontrado.',
      })
    }

    if (resultado.motivo === 'IDENTIDADE_EXISTENTE') {
      return response.status(409).json({
        erro: 'Já existe um militar com essa identidade.',
      })
    }

    if (resultado.motivo === 'SUBUNIDADE_INATIVA') {
      return response.status(409).json({
        erro: 'A subunidade selecionada está inativa.',
      })
    }

    return response.status(404).json({
      erro: 'Subunidade não encontrada.',
    })
  }

  return response.status(200).json({
    militar: resultado.militar,
  })
})