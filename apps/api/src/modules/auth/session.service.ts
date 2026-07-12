import {
  createHash,
  randomBytes,
} from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

type SessionMetadata = {
  ip?: string | null
  userAgent?: string | null
}

const refreshTokenDays = Number(
  process.env.REFRESH_TOKEN_DAYS ?? 7,
)

function gerarRefreshToken() {
  return randomBytes(48).toString('base64url')
}

function gerarTokenHash(token: string) {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}

function calcularExpiracao() {
  const expiresAt = new Date()

  expiresAt.setDate(
    expiresAt.getDate() + refreshTokenDays,
  )

  return expiresAt
}

function normalizarMetadata(metadata: SessionMetadata) {
  return {
    ip: metadata.ip?.slice(0, 45) || null,
    userAgent: metadata.userAgent?.slice(0, 500) || null,
  }
}

export async function criarSessao(
  usuarioId: number,
  metadata: SessionMetadata,
) {
  const refreshToken = gerarRefreshToken()

  await prisma.sessao.create({
    data: {
      usuarioId,
      refreshTokenHash: gerarTokenHash(refreshToken),
      expiresAt: calcularExpiracao(),
      ...normalizarMetadata(metadata),
    },
  })

  return refreshToken
}

export async function rotacionarSessao(
  refreshTokenAtual: string,
  metadata: SessionMetadata,
) {
  const agora = new Date()

  const sessaoAtual = await prisma.sessao.findUnique({
    where: {
      refreshTokenHash: gerarTokenHash(refreshTokenAtual),
    },
  })

  if (
    !sessaoAtual ||
    sessaoAtual.revokedAt ||
    sessaoAtual.expiresAt <= agora
  ) {
    return null
  }

  const novoRefreshToken = gerarRefreshToken()
  const novosDados = normalizarMetadata(metadata)

  const rotacao = await prisma.$transaction(
    async (transaction) => {
      const revogacao = await transaction.sessao.updateMany({
        where: {
          id: sessaoAtual.id,
          revokedAt: null,
          expiresAt: {
            gt: agora,
          },
        },
        data: {
          revokedAt: agora,
        },
      })

      if (revogacao.count !== 1) {
        return null
      }

      await transaction.sessao.create({
        data: {
          usuarioId: sessaoAtual.usuarioId,
          refreshTokenHash:
            gerarTokenHash(novoRefreshToken),
          expiresAt: calcularExpiracao(),
          ...novosDados,
        },
      })

      return {
        usuarioId: sessaoAtual.usuarioId,
        refreshToken: novoRefreshToken,
      }
    },
  )

  return rotacao
}

export async function revogarSessao(
  refreshToken: string,
) {
  await prisma.sessao.updateMany({
    where: {
      refreshTokenHash: gerarTokenHash(refreshToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  })
}