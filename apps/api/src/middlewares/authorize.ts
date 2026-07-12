import type {
  NextFunction,
  Request,
  Response,
} from 'express'

export function authorize(...permissoesObrigatorias: string[]) {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    if (!request.auth) {
      return response.status(401).json({
        erro: 'Usuário não autenticado.',
      })
    }

    const permissoesDoUsuario = new Set(
      request.auth.permissoes,
    )

    const possuiTodas = permissoesObrigatorias.every(
      (permissao) => permissoesDoUsuario.has(permissao),
    )

    if (!possuiTodas) {
      return response.status(403).json({
        erro: 'Você não possui permissão para realizar esta ação.',
      })
    }

    return next()
  }
}