import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import {
  atualizarFeriadoSchema,
  criarFeriadoSchema,
  feriadoIdSchema,
  listarFeriadosSchema,
} from './feriado.schema.js'
import {
  atualizarFeriado,
  criarFeriado,
  excluirFeriado,
  listarFeriados,
} from './feriado.service.js'

export const feriadoRouter = Router()

feriadoRouter.use(
  authenticate,
  authorize('feriado:gerenciar'),
)

feriadoRouter.get('/', async (request, response) => {
  const validacao = listarFeriadosSchema.safeParse(request.query)

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Filtros inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const feriados = await listarFeriados(validacao.data)

  return response.status(200).json({
    feriados,
  })
})

feriadoRouter.post('/', async (request, response) => {
  const validacao = criarFeriadoSchema.safeParse(request.body)

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const resultado = await criarFeriado(
    validacao.data,
    request.auth!.usuarioId,
  )

  if (!resultado.sucesso) {
    return response.status(409).json({
      erro: 'Já existe um feriado cadastrado nessa data.',
    })
  }

  return response.status(201).json({
    feriado: resultado.feriado,
    mensagem: 'Feriado cadastrado com sucesso.',
  })
})

feriadoRouter.patch('/:id', async (request, response) => {
  const id = feriadoIdSchema.safeParse(request.params.id)
  const dados = atualizarFeriadoSchema.safeParse(request.body)

  if (!id.success || !dados.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: dados.success
        ? undefined
        : dados.error.flatten().fieldErrors,
    })
  }

  const resultado = await atualizarFeriado(id.data, dados.data)

  if (!resultado.sucesso) {
    if (resultado.motivo === 'NAO_ENCONTRADO') {
      return response.status(404).json({
        erro: 'Feriado não encontrado.',
      })
    }

    return response.status(409).json({
      erro: 'Já existe um feriado cadastrado nessa data.',
    })
  }

  return response.status(200).json({
    feriado: resultado.feriado,
    mensagem: 'Feriado atualizado com sucesso.',
  })
})

feriadoRouter.delete('/:id', async (request, response) => {
  const id = feriadoIdSchema.safeParse(request.params.id)

  if (!id.success) {
    return response.status(400).json({
      erro: 'Identificador inválido.',
    })
  }

  const resultado = await excluirFeriado(id.data)

  if (!resultado.sucesso) {
    return response.status(404).json({
      erro: 'Feriado não encontrado.',
    })
  }

  return response.status(204).send()
})