import { prisma } from '../../lib/prisma.js'
import type {
  AtualizarFeriadoInput,
  CriarFeriadoInput,
  ListarFeriadosInput,
} from './feriado.schema.js'

const dadosRelacionados = {
  cadastradoPor: {
    select: {
      id: true,
      militar: {
        select: {
          nomeGuerra: true,
          postoGraduacao: true,
        },
      },
    },
  },
} as const

function obterLimitesAno(ano: number) {
  return {
    inicio: new Date(Date.UTC(ano, 0, 1)),
    fim: new Date(Date.UTC(ano + 1, 0, 1)),
  }
}

export async function listarFeriados(
  filtros: ListarFeriadosInput,
) {
  const limites = filtros.ano
    ? obterLimitesAno(filtros.ano)
    : null
  const busca = filtros.busca || undefined

  return prisma.feriado.findMany({
    where: {
      ...(limites
        ? {
            data: {
              gte: limites.inicio,
              lt: limites.fim,
            },
          }
        : {}),
      ...(busca
        ? {
            descricao: {
              contains: busca,
            },
          }
        : {}),
    },
    include: dadosRelacionados,
    orderBy: {
      data: 'asc',
    },
  })
}

export async function criarFeriado(
  dados: CriarFeriadoInput,
  cadastradoPorId: number,
) {
  const existente = await prisma.feriado.findUnique({
    where: {
      data: dados.data,
    },
    select: {
      id: true,
    },
  })

  if (existente) {
    return {
      sucesso: false,
      motivo: 'DATA_EXISTENTE',
    } as const
  }

  const feriado = await prisma.feriado.create({
    data: {
      ...dados,
      cadastradoPorId,
    },
    include: dadosRelacionados,
  })

  return {
    sucesso: true,
    feriado,
  } as const
}

export async function atualizarFeriado(
  id: number,
  dados: AtualizarFeriadoInput,
) {
  const existente = await prisma.feriado.findUnique({
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
    dados.data &&
    dados.data.getTime() !== existente.data.getTime()
  ) {
    const dataEmUso = await prisma.feriado.findUnique({
      where: {
        data: dados.data,
      },
      select: {
        id: true,
      },
    })

    if (dataEmUso) {
      return {
        sucesso: false,
        motivo: 'DATA_EXISTENTE',
      } as const
    }
  }

  const feriado = await prisma.feriado.update({
    where: {
      id,
    },
    data: dados,
    include: dadosRelacionados,
  })

  return {
    sucesso: true,
    feriado,
  } as const
}

export async function excluirFeriado(id: number) {
  const existente = await prisma.feriado.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  })

  if (!existente) {
    return {
      sucesso: false,
      motivo: 'NAO_ENCONTRADO',
    } as const
  }

  await prisma.feriado.delete({
    where: {
      id,
    },
  })

  return {
    sucesso: true,
  } as const
}