import { randomInt } from 'node:crypto'
import * as argon2 from 'argon2'
import { prisma } from '../../lib/prisma.js'
import type {
  AtualizarUsuarioInput,
  CriarUsuarioInput,
  ListarUsuariosInput,
} from './usuario.schema.js'

const dadosUsuario = {
  militar: {
    select: {
      id: true,
      identidadeMilitar: true,
      nomeCompleto: true,
      nomeGuerra: true,
      postoGraduacao: true,
      situacao: true,
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
          id: true,
          codigo: true,
          nome: true,
        },
      },
    },
    orderBy: {
      perfil: {
        nome: 'asc',
      },
    },
  },
} as const

function gerarSenhaTemporaria() {
  const grupos = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%*_-',
  ]
  const caracteres = grupos.join('')
  const senha = grupos.map(
    (grupo) => grupo[randomInt(grupo.length)]!,
  )

  while (senha.length < 14) {
    senha.push(caracteres[randomInt(caracteres.length)]!)
  }

  for (let indice = senha.length - 1; indice > 0; indice -= 1) {
    const destino = randomInt(indice + 1)
    const temporario = senha[indice]!

    senha[indice] = senha[destino]!
    senha[destino] = temporario
  }

  return senha.join('')
}

async function buscarPerfis(codigos: CriarUsuarioInput['perfis']) {
  return prisma.perfil.findMany({
    where: {
      codigo: {
        in: codigos,
      },
    },
    select: {
      id: true,
      codigo: true,
    },
  })
}

async function emailEstaEmUso(email: string, ignorarId?: number) {
  const usuario = await prisma.usuario.findFirst({
    where: {
      email,
      ...(ignorarId
        ? {
            id: {
              not: ignorarId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  return Boolean(usuario)
}

async function ehUltimoAdministradorAtivo(usuarioId: number) {
  const usuario = await prisma.usuario.findUnique({
    where: {
      id: usuarioId,
    },
    select: {
      ativo: true,
      perfis: {
        where: {
          perfil: {
            codigo: 'ADMINISTRADOR',
          },
        },
        select: {
          perfilId: true,
        },
      },
    },
  })

  if (!usuario?.ativo || usuario.perfis.length === 0) {
    return false
  }

  const administradoresAtivos = await prisma.usuario.count({
    where: {
      ativo: true,
      perfis: {
        some: {
          perfil: {
            codigo: 'ADMINISTRADOR',
          },
        },
      },
    },
  })

  return administradoresAtivos === 1
}

export async function listarUsuarios(
  filtros: ListarUsuariosInput,
) {
  const busca = filtros.busca || undefined

  return prisma.usuario.findMany({
    where: {
      ...(filtros.ativo !== undefined
        ? { ativo: filtros.ativo }
        : {}),
      ...(busca
        ? {
            OR: [
              {
                email: {
                  contains: busca,
                },
              },
              {
                militar: {
                  identidadeMilitar: {
                    contains: busca,
                  },
                },
              },
              {
                militar: {
                  nomeCompleto: {
                    contains: busca,
                  },
                },
              },
              {
                militar: {
                  nomeGuerra: {
                    contains: busca,
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      ativo: true,
      primeiroAcesso: true,
      ultimoLogin: true,
      createdAt: true,
      ...dadosUsuario,
    },
    orderBy: [
      {
        ativo: 'desc',
      },
      {
        militar: {
          nomeGuerra: 'asc',
        },
      },
    ],
  })
}

export async function obterContextoUsuarios() {
  const [militaresDisponiveis, perfis] = await Promise.all([
    prisma.militar.findMany({
      where: {
        situacao: 'ATIVO',
        usuario: null,
      },
      select: {
        id: true,
        identidadeMilitar: true,
        nomeGuerra: true,
        nomeCompleto: true,
        postoGraduacao: true,
        subunidade: {
          select: {
            id: true,
            sigla: true,
            nome: true,
          },
        },
      },
      orderBy: [
        {
          postoGraduacao: 'asc',
        },
        {
          nomeGuerra: 'asc',
        },
      ],
    }),
    prisma.perfil.findMany({
      select: {
        id: true,
        codigo: true,
        nome: true,
        descricao: true,
      },
      orderBy: {
        nome: 'asc',
      },
    }),
  ])

  return {
    militaresDisponiveis,
    perfis,
  }
}

export async function criarUsuario(dados: CriarUsuarioInput) {
  const militar = await prisma.militar.findUnique({
    where: {
      id: dados.militarId,
    },
    select: {
      id: true,
      situacao: true,
      usuario: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!militar) {
    return {
      sucesso: false,
      motivo: 'MILITAR_NAO_ENCONTRADO',
    } as const
  }

  if (militar.situacao !== 'ATIVO') {
    return {
      sucesso: false,
      motivo: 'MILITAR_INATIVO',
    } as const
  }

  if (militar.usuario) {
    return {
      sucesso: false,
      motivo: 'MILITAR_JA_POSSUI_USUARIO',
    } as const
  }

  if (dados.email && (await emailEstaEmUso(dados.email))) {
    return {
      sucesso: false,
      motivo: 'EMAIL_EXISTENTE',
    } as const
  }

  const perfis = await buscarPerfis(dados.perfis)

  if (perfis.length !== dados.perfis.length) {
    return {
      sucesso: false,
      motivo: 'PERFIL_INVALIDO',
    } as const
  }

  const senhaTemporaria = gerarSenhaTemporaria()
  const senhaHash = await argon2.hash(senhaTemporaria, {
    type: argon2.argon2id,
  })

  const usuario = await prisma.usuario.create({
    data: {
      militarId: dados.militarId,
      email: dados.email,
      senhaHash,
      ativo: true,
      primeiroAcesso: true,
      perfis: {
        create: perfis.map((perfil) => ({
          perfilId: perfil.id,
        })),
      },
    },
    select: {
      id: true,
      email: true,
      ativo: true,
      primeiroAcesso: true,
      ultimoLogin: true,
      createdAt: true,
      ...dadosUsuario,
    },
  })

  return {
    sucesso: true,
    usuario,
    senhaTemporaria,
  } as const
}

export async function atualizarUsuario(
  id: number,
  dados: AtualizarUsuarioInput,
  administradorId: number,
) {
  const usuario = await prisma.usuario.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      ativo: true,
      perfis: {
        select: {
          perfil: {
            select: {
              codigo: true,
            },
          },
        },
      },
    },
  })

  if (!usuario) {
    return {
      sucesso: false,
      motivo: 'NAO_ENCONTRADO',
    } as const
  }

  if (id === administradorId && dados.ativo === false) {
    return {
      sucesso: false,
      motivo: 'NAO_PODE_DESATIVAR_PROPRIO_USUARIO',
    } as const
  }

  const administradorAtualmente = usuario.perfis.some(
    (item) => item.perfil.codigo === 'ADMINISTRADOR',
  )
  const continuaraAdministrador = dados.perfis
    ? dados.perfis.includes('ADMINISTRADOR')
    : administradorAtualmente
  const perderaAdministrador =
    administradorAtualmente && !continuaraAdministrador
  const seraDesativado = usuario.ativo && dados.ativo === false

  if (
    (perderaAdministrador || seraDesativado) &&
    (await ehUltimoAdministradorAtivo(id))
  ) {
    return {
      sucesso: false,
      motivo: 'ULTIMO_ADMINISTRADOR',
    } as const
  }

  if (dados.email && (await emailEstaEmUso(dados.email, id))) {
    return {
      sucesso: false,
      motivo: 'EMAIL_EXISTENTE',
    } as const
  }

  const perfis = dados.perfis
    ? await buscarPerfis(dados.perfis)
    : null

  if (
    perfis &&
    dados.perfis &&
    perfis.length !== dados.perfis.length
  ) {
    return {
      sucesso: false,
      motivo: 'PERFIL_INVALIDO',
    } as const
  }

  const usuarioAtualizado = await prisma.$transaction(
    async (transaction) => {
      if (perfis) {
        await transaction.usuarioPerfil.deleteMany({
          where: {
            usuarioId: id,
          },
        })

        await transaction.usuarioPerfil.createMany({
          data: perfis.map((perfil) => ({
            usuarioId: id,
            perfilId: perfil.id,
          })),
        })
      }

      await transaction.usuario.update({
        where: {
          id,
        },
        data: {
          ...(dados.email !== undefined
            ? { email: dados.email }
            : {}),
          ...(dados.ativo !== undefined
            ? { ativo: dados.ativo }
            : {}),
        },
      })

      if (dados.ativo === false || perfis) {
        await transaction.sessao.updateMany({
          where: {
            usuarioId: id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        })
      }

      return transaction.usuario.findUniqueOrThrow({
        where: {
          id,
        },
        select: {
          id: true,
          email: true,
          ativo: true,
          primeiroAcesso: true,
          ultimoLogin: true,
          createdAt: true,
          ...dadosUsuario,
        },
      })
    },
  )

  return {
    sucesso: true,
    usuario: usuarioAtualizado,
  } as const
}

export async function redefinirSenhaUsuario(id: number) {
  const usuario = await prisma.usuario.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  })

  if (!usuario) {
    return {
      sucesso: false,
      motivo: 'NAO_ENCONTRADO',
    } as const
  }

  const senhaTemporaria = gerarSenhaTemporaria()
  const senhaHash = await argon2.hash(senhaTemporaria, {
    type: argon2.argon2id,
  })

  await prisma.$transaction([
    prisma.usuario.update({
      where: {
        id,
      },
      data: {
        senhaHash,
        primeiroAcesso: true,
      },
    }),
    prisma.sessao.updateMany({
      where: {
        usuarioId: id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ])

  return {
    sucesso: true,
    senhaTemporaria,
  } as const
}