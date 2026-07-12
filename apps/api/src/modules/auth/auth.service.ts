import * as argon2 from 'argon2'
import { SignJWT } from 'jose'
import { jwtConfig, jwtSecret } from '../../config/jwt.js'
import { prisma } from '../../lib/prisma.js'
import type { LoginInput } from './auth.schema.js'

export async function realizarLogin({ login, senha }: LoginInput) {
  const usuario = await prisma.usuario.findFirst({
    where: {
      ativo: true,
      OR: [
        {
          email: login,
        },
        {
          militar: {
            identidadeMilitar: login,
          },
        },
      ],
    },
    include: {
      militar: {
        include: {
          subunidade: true,
        },
      },
      perfis: {
        include: {
          perfil: {
            include: {
              permissoes: {
                include: {
                  permissao: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!usuario) {
    return null
  }

  const senhaValida = await argon2.verify(
    usuario.senhaHash,
    senha,
  )

  if (!senhaValida) {
    return null
  }

  const perfis = usuario.perfis.map(
    (item) => item.perfil.codigo,
  )

  const permissoes = [
    ...new Set(
      usuario.perfis.flatMap((item) =>
        item.perfil.permissoes.map(
          (perfilPermissao) =>
            perfilPermissao.permissao.codigo,
        ),
      ),
    ),
  ]

  const accessToken = await new SignJWT({
    perfis,
    permissoes,
  })
    .setProtectedHeader({
      alg: 'HS256',
      typ: 'JWT',
    })
    .setSubject(String(usuario.id))
    .setIssuer(jwtConfig.issuer)
    .setAudience(jwtConfig.audience)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(jwtSecret)

  await prisma.usuario.update({
    where: {
      id: usuario.id,
    },
    data: {
      ultimoLogin: new Date(),
    },
  })

  return {
    accessToken,
    expiresIn: 900,
    usuario: {
      id: usuario.id,
      nomeCompleto: usuario.militar.nomeCompleto,
      nomeGuerra: usuario.militar.nomeGuerra,
      postoGraduacao: usuario.militar.postoGraduacao,
      subunidade: usuario.militar.subunidade.sigla,
      primeiroAcesso: usuario.primeiroAcesso,
      perfis,
      permissoes,
    },
  }
}

export async function obterUsuarioAtual(usuarioId: number) {
  return prisma.usuario.findFirst({
    where: {
      id: usuarioId,
      ativo: true,
    },
    select: {
      id: true,
      email: true,
      primeiroAcesso: true,
      ultimoLogin: true,
      militar: {
        select: {
          identidadeMilitar: true,
          nomeCompleto: true,
          nomeGuerra: true,
          postoGraduacao: true,
          subunidade: {
            select: {
              id: true,
              sigla: true,
              nome: true,
            },
          },
        },
      },
      perfis: {
        select: {
          perfil: {
            select: {
              codigo: true,
              nome: true,
            },
          },
        },
      },
    },
  })
}