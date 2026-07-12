import type {
  NextFunction,
  Request,
  Response,
} from 'express'
import { jwtVerify } from 'jose'
import { jwtConfig, jwtSecret } from '../config/jwt.js'

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return response.status(401).json({
      erro: 'Token de acesso não informado.',
    })
  }

  const token = authorization.slice(7)

  try {
    const { payload } = await jwtVerify(token, jwtSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithms: ['HS256'],
    })

    const usuarioId = Number(payload.sub)

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return response.status(401).json({
        erro: 'Token de acesso inválido.',
      })
    }

    request.auth = {
      usuarioId,
      perfis: Array.isArray(payload.perfis)
        ? payload.perfis.filter(
            (perfil): perfil is string => typeof perfil === 'string',
          )
        : [],
      permissoes: Array.isArray(payload.permissoes)
        ? payload.permissoes.filter(
            (permissao): permissao is string =>
              typeof permissao === 'string',
          )
        : [],
    }

    return next()
  } catch {
    return response.status(401).json({
      erro: 'Token de acesso inválido ou expirado.',
    })
  }
}