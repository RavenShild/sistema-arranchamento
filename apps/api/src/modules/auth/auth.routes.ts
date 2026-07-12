import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { loginSchema } from './auth.schema.js'
import { authenticate } from '../../middlewares/authenticate.js'
import {
  obterUsuarioAtual,
  realizarLogin,
} from './auth.service.js'


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
    const resultado = await realizarLogin(resultadoValidacao.data)

    if (!resultado) {
      return response.status(401).json({
        erro: 'Identidade, e-mail ou senha inválidos.',
      })
    }

    return response.status(200).json(resultado)
  } catch (error) {
    console.error('Erro interno no login:', error)

    return response.status(500).json({
      erro: 'Não foi possível realizar o login.',
    })
  }
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