import { prisma } from '../../lib/prisma.js'
import type {
  AtualizarSubunidadeInput,
  CriarSubunidadeInput,
} from './subunidade.schema.js'

export async function listarSubunidades() {
  return prisma.subunidade.findMany({
    orderBy: [
      {
        ativa: 'desc',
      },
      {
        sigla: 'asc',
      },
    ],
    include: {
      _count: {
        select: {
          militares: true,
        },
      },
    },
  })
}

export async function criarSubunidade(
  dados: CriarSubunidadeInput,
) {
  const existente = await prisma.subunidade.findUnique({
    where: {
      sigla: dados.sigla,
    },
  })

  if (existente) {
    return {
      sucesso: false,
      motivo: 'SIGLA_EXISTENTE',
    } as const
  }

  const subunidade = await prisma.subunidade.create({
    data: dados,
  })

  return {
    sucesso: true,
    subunidade,
  } as const
}

export async function atualizarSubunidade(
  id: number,
  dados: AtualizarSubunidadeInput,
) {
  const existente = await prisma.subunidade.findUnique({
    where: {
      id,
    },
  })

  if (!existente) {
    return {
      sucesso: false,
      motivo: 'NAO_ENCONTRADA',
    } as const
  }

  if (dados.sigla && dados.sigla !== existente.sigla) {
    const siglaEmUso = await prisma.subunidade.findUnique({
      where: {
        sigla: dados.sigla,
      },
    })

    if (siglaEmUso) {
      return {
        sucesso: false,
        motivo: 'SIGLA_EXISTENTE',
      } as const
    }
  }

  const subunidade = await prisma.subunidade.update({
    where: {
      id,
    },
    data: dados,
  })

  return {
    sucesso: true,
    subunidade,
  } as const
}