import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import {
  refreshCookieClearOptions,
  refreshCookieName,
  refreshCookieOptions,
} from '../../config/cookies.js'
import { authenticate } from '../../middlewares/authenticate.js'
import {
  alterarSenhaSchema,
  loginSchema,
} from './auth.schema.js'
import {
  alterarSenha,
  obterUsuarioAtual,
  realizarLogin,
  renovarLogin,
} from './auth.service.js'
import { revogarSessao } from './session.service.js'

export const authRouter = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    erro: 'Muitas tentativas de login. Tente novamente mais tarde.',
  },
})

authRouter.post('/login', loginLimiter, async (request, response) => {
  const resultadoValidacao = loginSchema.safeParse(request.body)

  if (!resultadoValidacao.success) {
    return response.status(400).json({
      erro: 'Dados de login inválidos.',
      detalhes: resultadoValidacao.error.flatten().fieldErrors,
    })
  }

  try {
    const resultado = await realizarLogin(
      resultadoValidacao.data,
      {
        ip: request.ip,
        userAgent: request.get('user-agent'),
      },
    )

    if (!resultado) {
      return response.status(401).json({
        erro: 'Identidade militar ou senha inválidos.',
      })
    }

    const {
      refreshToken,
      ...resposta
    } = resultado

    response.cookie(
      refreshCookieName,
      refreshToken,
      refreshCookieOptions,
    )

    return response.status(200).json(resposta)
  } catch (error) {
    console.error('Erro interno no login:', error)

    return response.status(500).json({
      erro: 'Não foi possível realizar o login.',
    })
  }
})

authRouter.post('/refresh', async (request, response) => {
  const refreshToken = request.cookies[
    refreshCookieName
  ] as string | undefined

  if (!refreshToken) {
    return response.status(401).json({
      erro: 'Sessão não encontrada.',
    })
  }

  const resultado = await renovarLogin(refreshToken, {
    ip: request.ip,
    userAgent: request.get('user-agent'),
  })

  if (!resultado) {
    response.clearCookie(
      refreshCookieName,
      refreshCookieClearOptions,
    )

    return response.status(401).json({
      erro: 'Sessão inválida ou expirada.',
    })
  }

  const {
    refreshToken: novoRefreshToken,
    ...resposta
  } = resultado

  response.cookie(
    refreshCookieName,
    novoRefreshToken,
    refreshCookieOptions,
  )

  return response.status(200).json(resposta)
})

authRouter.post('/logout', async (request, response) => {
  const refreshToken = request.cookies[
    refreshCookieName
  ] as string | undefined

  if (refreshToken) {
    await revogarSessao(refreshToken)
  }

  response.clearCookie(
    refreshCookieName,
    refreshCookieClearOptions,
  )

  return response.status(204).send()
})

authRouter.get('/me', authenticate, async (request, response) => {
  const usuarioId = request.auth?.usuarioId

  if (!usuarioId) {
    return response.status(401).json({
      erro: 'Usuário não autenticado.',
    })
  }

  const usuario = await obterUsuarioAtual(usuarioId)

  if (!usuario) {
    return response.status(404).json({
      erro: 'Usuário não encontrado ou inativo.',
    })
  }

  return response.status(200).json({
    usuario,
  })
})

authRouter.patch(
  '/password',
  authenticate,
  async (request, response) => {
    const usuarioId = request.auth?.usuarioId

    if (!usuarioId) {
      return response.status(401).json({
        erro: 'Usuário não autenticado.',
      })
    }

    const validacao = alterarSenhaSchema.safeParse(request.body)

    if (!validacao.success) {
      const detalhes = validacao.error.flatten().fieldErrors
      const primeiroErro =
        detalhes.senhaAtual?.[0] ??
        detalhes.novaSenha?.[0] ??
        detalhes.confirmacaoSenha?.[0] ??
        'Dados inválidos.'

      return response.status(400).json({
        erro: primeiroErro,
        detalhes,
      })
    }

    const resultado = await alterarSenha(
      usuarioId,
      validacao.data,
    )

    if (!resultado.sucesso) {
      const mensagens = {
        USUARIO_INVALIDO: 'Usuário não encontrado ou inativo.',
        SENHA_ATUAL_INVALIDA: 'A senha atual está incorreta.',
        SENHA_REUTILIZADA:
          'A nova senha deve ser diferente da senha atual.',
      }

      return response.status(400).json({
        erro: mensagens[resultado.motivo],
      })
    }

    return response.status(200).json({
      mensagem: 'Senha alterada com sucesso.',
    })
  },
)