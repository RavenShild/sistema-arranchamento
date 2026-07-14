import type {
  NextFunction,
  Request,
  Response,
} from 'express'
import {
  registrarAuditoria,
  type JsonSeguro,
  type JsonSeguroRaiz,
} from '../modules/auditoria/auditoria.service.js'

const metodosAuditados = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const camposSensiveis = [
  'senha',
  'password',
  'token',
  'hash',
  'authorization',
  'cookie',
]

function campoEhSensivel(chave: string) {
  const chaveNormalizada = chave.toLocaleLowerCase('pt-BR')

  return camposSensiveis.some((campo) =>
    chaveNormalizada.includes(campo),
  )
}

function sanitizarValor(valor: unknown, profundidade = 0): JsonSeguro {
  if (profundidade >= 5) {
    return '[CONTEÚDO OMITIDO]'
  }

  if (
    valor === null ||
    typeof valor === 'string' ||
    typeof valor === 'number' ||
    typeof valor === 'boolean'
  ) {
    return valor
  }

  if (Array.isArray(valor)) {
    return valor
      .slice(0, 100)
      .map((item) => sanitizarValor(item, profundidade + 1))
  }

  if (typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(
        ([chave, conteudo]) => [
          chave,
          campoEhSensivel(chave)
            ? '[PROTEGIDO]'
            : sanitizarValor(conteudo, profundidade + 1),
        ],
      ),
    )
  }

  return String(valor)
}

function sanitizarCorpo(valor: unknown): JsonSeguroRaiz | undefined {
  if (valor === undefined || valor === null) {
    return undefined
  }

  return sanitizarValor(valor) as JsonSeguroRaiz
}

function obterAcao(metodo: string) {
  if (metodo === 'POST') {
    return 'CRIACAO' as const
  }

  if (metodo === 'DELETE') {
    return 'EXCLUSAO' as const
  }

  return 'ALTERACAO' as const
}

function obterIdentificacaoRecurso(rota: string) {
  const segmentos = rota.split('/').filter(Boolean)
  const recurso = segmentos[0]?.slice(0, 80) || 'sistema'
  const recursoId = segmentos
    .slice(1)
    .find((segmento) => /^\d+$/.test(segmento))

  return {
    recurso,
    recursoId: recursoId?.slice(0, 80),
  }
}

export function auditMutations(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (!metodosAuditados.has(request.method)) {
    return next()
  }

  response.once('finish', () => {
    if (
      !request.auth?.usuarioId ||
      response.statusCode < 200 ||
      response.statusCode >= 300
    ) {
      return
    }

    const rota = request.originalUrl.split('?')[0]?.slice(0, 255) || '/'
    const { recurso, recursoId } = obterIdentificacaoRecurso(rota)
    const corpo = request.body as unknown

    void registrarAuditoria({
      usuarioId: request.auth.usuarioId,
      acao: obterAcao(request.method),
      recurso,
      recursoId,
      metodo: request.method.slice(0, 10),
      rota,
      statusHttp: response.statusCode,
      dados: sanitizarCorpo(corpo),
      ip: request.ip?.slice(0, 45),
      userAgent: request.get('user-agent')?.slice(0, 500),
    }).catch((error: unknown) => {
      console.error('Não foi possível registrar a auditoria.', error)
    })
  })

  return next()
}