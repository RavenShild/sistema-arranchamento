import { prisma } from '../../lib/prisma.js'
import type {
  AtualizarMilitarInput,
  CriarMilitarInput,
  ListarMilitaresInput,
} from './militar.schema.js'

const dadosRelacionados = {
  subunidade: {
    select: {
      id: true,
      sigla: true,
      nome: true,
      ativa: true,
    },
  },
  usuario: {
    select: {
      id: true,
      email: true,
      ativo: true,
    },
  },
} as const

export async function listarMilitares(
  filtros: ListarMilitaresInput,
) {
  const busca = filtros.busca || undefined

  return prisma.militar.findMany({
    where: {
      situacao: filtros.situacao,
      subunidadeId: filtros.subunidadeId,
      ...(busca
        ? {
            OR: [
              {
                identidadeMilitar: {
                  contains: busca,
                },
              },
              {
                nomeCompleto: {
                  contains: busca,
                },
              },
              {
                nomeGuerra: {
                  contains: busca,
                },
              },
              {
                postoGraduacao: {
                  contains: busca,
                },
              },
            ],
          }
        : {}),
    },
    include: dadosRelacionados,
    orderBy: [
      {
        situacao: 'asc',
      },
      {
        nomeGuerra: 'asc',
      },
    ],
  })
}

export async function obterMilitar(id: number) {
  return prisma.militar.findUnique({
    where: {
      id,
    },
    include: dadosRelacionados,
  })
}

export async function criarMilitar(
  dados: CriarMilitarInput,
) {
  const identidadeEmUso = await prisma.militar.findUnique({
    where: {
      identidadeMilitar: dados.identidadeMilitar,
    },
  })

  if (identidadeEmUso) {
    return {
      sucesso: false,
      motivo: 'IDENTIDADE_EXISTENTE',
    } as const
  }

  const subunidade = await prisma.subunidade.findUnique({
    where: {
      id: dados.subunidadeId,
    },
  })

  if (!subunidade) {
    return {
      sucesso: false,
      motivo: 'SUBUNIDADE_NAO_ENCONTRADA',
    } as const
  }

  if (!subunidade.ativa) {
    return {
      sucesso: false,
      motivo: 'SUBUNIDADE_INATIVA',
    } as const
  }

  const militar = await prisma.militar.create({
    data: dados,
    include: dadosRelacionados,
  })

  return {
    sucesso: true,
    militar,
  } as const
}

export async function atualizarMilitar(
  id: number,
  dados: AtualizarMilitarInput,
) {
  const existente = await prisma.militar.findUnique({
    where: {
      id,
    },
  })

  if (!existente) {
    return {
      sucesso: false,
      motivo: 'NAO_ENCONTRADO',
    } as const
  }

  if (
    dados.identidadeMilitar &&
    dados.identidadeMilitar !== existente.identidadeMilitar
  ) {
    const identidadeEmUso = await prisma.militar.findUnique({
      where: {
        identidadeMilitar: dados.identidadeMilitar,
      },
    })

    if (identidadeEmUso) {
      return {
        sucesso: false,
        motivo: 'IDENTIDADE_EXISTENTE',
      } as const
    }
  }

  if (
    dados.subunidadeId !== undefined &&
    dados.subunidadeId !== existente.subunidadeId
  ) {
    const subunidade = await prisma.subunidade.findUnique({
      where: {
        id: dados.subunidadeId,
      },
    })

    if (!subunidade) {
      return {
        sucesso: false,
        motivo: 'SUBUNIDADE_NAO_ENCONTRADA',
      } as const
    }

    if (!subunidade.ativa) {
      return {
        sucesso: false,
        motivo: 'SUBUNIDADE_INATIVA',
      } as const
    }
  }

  const militar = await prisma.militar.update({
    where: {
      id,
    },
    data: dados,
    include: dadosRelacionados,
  })

  return {
    sucesso: true,
    militar,
  } as const
}