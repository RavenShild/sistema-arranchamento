import { Router } from 'express'
import { authenticate } from '../../middlewares/authenticate.js'
import { authorize } from '../../middlewares/authorize.js'
import {
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  listarUsuariosSchema,
  usuarioIdSchema,
} from './usuario.schema.js'
import {
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  obterContextoUsuarios,
  redefinirSenhaUsuario,
} from './usuario.service.js'

export const usuarioRouter = Router()

usuarioRouter.use(
  authenticate,
  authorize('usuario:gerenciar'),
)

usuarioRouter.get('/', async (request, response) => {
  const validacao = listarUsuariosSchema.safeParse(request.query)

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Filtros inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const usuarios = await listarUsuarios(validacao.data)

  return response.status(200).json({
    usuarios,
  })
})

usuarioRouter.get('/contexto', async (_request, response) => {
  const contexto = await obterContextoUsuarios()

  return response.status(200).json(contexto)
})

usuarioRouter.post('/', async (request, response) => {
  const validacao = criarUsuarioSchema.safeParse(request.body)

  if (!validacao.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: validacao.error.flatten().fieldErrors,
    })
  }

  const resultado = await criarUsuario(validacao.data)

  if (!resultado.sucesso) {
    const respostas = {
      MILITAR_NAO_ENCONTRADO: {
        status: 404,
        erro: 'Militar não encontrado.',
      },
      MILITAR_INATIVO: {
        status: 409,
        erro: 'Somente militares ativos podem receber acesso.',
      },
      MILITAR_JA_POSSUI_USUARIO: {
        status: 409,
        erro: 'O militar selecionado já possui usuário.',
      },
      EMAIL_EXISTENTE: {
        status: 409,
        erro: 'O e-mail informado já está sendo utilizado.',
      },
      PERFIL_INVALIDO: {
        status: 400,
        erro: 'Um ou mais perfis são inválidos.',
      },
    } as const
    const resposta = respostas[resultado.motivo]

    return response.status(resposta.status).json({
      erro: resposta.erro,
    })
  }

  return response.status(201).json({
    usuario: resultado.usuario,
    senhaTemporaria: resultado.senhaTemporaria,
    mensagem:
      'Usuário criado. A senha temporária será exibida somente nesta resposta.',
  })
})

usuarioRouter.patch('/:id', async (request, response) => {
  const id = usuarioIdSchema.safeParse(request.params.id)
  const dados = atualizarUsuarioSchema.safeParse(request.body)

  if (!id.success || !dados.success) {
    return response.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: dados.success
        ? undefined
        : dados.error.flatten().fieldErrors,
    })
  }

  const resultado = await atualizarUsuario(
    id.data,
    dados.data,
    request.auth!.usuarioId,
  )

  if (!resultado.sucesso) {
    const respostas = {
      NAO_ENCONTRADO: {
        status: 404,
        erro: 'Usuário não encontrado.',
      },
      NAO_PODE_DESATIVAR_PROPRIO_USUARIO: {
        status: 409,
        erro: 'Você não pode desativar o próprio usuário.',
      },
      ULTIMO_ADMINISTRADOR: {
        status: 409,
        erro: 'O sistema deve manter pelo menos um administrador ativo.',
      },
      EMAIL_EXISTENTE: {
        status: 409,
        erro: 'O e-mail informado já está sendo utilizado.',
      },
      PERFIL_INVALIDO: {
        status: 400,
        erro: 'Um ou mais perfis são inválidos.',
      },
    } as const
    const resposta = respostas[resultado.motivo]

    return response.status(resposta.status).json({
      erro: resposta.erro,
    })
  }

  return response.status(200).json({
    usuario: resultado.usuario,
    mensagem: 'Usuário atualizado com sucesso.',
  })
})

usuarioRouter.post(
  '/:id/redefinir-senha',
  async (request, response) => {
    const id = usuarioIdSchema.safeParse(request.params.id)

    if (!id.success) {
      return response.status(400).json({
        erro: 'Identificador inválido.',
      })
    }

    const resultado = await redefinirSenhaUsuario(id.data)

    if (!resultado.sucesso) {
      return response.status(404).json({
        erro: 'Usuário não encontrado.',
      })
    }

    return response.status(200).json({
      senhaTemporaria: resultado.senhaTemporaria,
      mensagem:
        'Senha redefinida. A senha temporária será exibida somente nesta resposta.',
    })
  },
)