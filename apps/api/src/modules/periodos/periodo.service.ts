import { prisma } from '../../lib/prisma.js'
import type {
  CriarPeriodoInput,
  ListarPeriodosInput,
} from './periodo.schema.js'

const dadosRelacionados = {
  abertoPor: {
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
  fechadoPor: {
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
  _count: {
    select: {
      arranchamentos: true,
      escalasServico: true,
    },
  },
} as const

function adicionarDias(data: Date, quantidade: number) {
  const resultado = new Date(data)
  resultado.setUTCDate(resultado.getUTCDate() + quantidade)

  return resultado
}

export async function listarPeriodos(
  filtros: ListarPeriodosInput,
) {
  return prisma.periodoArranchamento.findMany({
    where: {
      status: filtros.status,
    },
    include: dadosRelacionados,
    orderBy: {
      dataInicio: 'desc',
    },
  })
}

export async function obterPeriodoAberto() {
  return prisma.periodoArranchamento.findFirst({
    where: {
      status: 'ABERTO',
    },
    include: dadosRelacionados,
    orderBy: {
      dataInicio: 'desc',
    },
  })
}

export async function criarPeriodo(
  dados: CriarPeriodoInput,
  abertoPorId: number,
) {
  const dataFim = adicionarDias(dados.dataInicio, 6)

  return prisma.$transaction(async (transaction) => {
    const periodoAberto =
      await transaction.periodoArranchamento.findFirst({
        where: {
          status: 'ABERTO',
        },
        select: {
          id: true,
        },
      })

    if (periodoAberto) {
      return {
        sucesso: false,
        motivo: 'PERIODO_ABERTO_EXISTENTE',
      } as const
    }

    const periodoSobreposto =
      await transaction.periodoArranchamento.findFirst({
        where: {
          dataInicio: {
            lte: dataFim,
          },
          dataFim: {
            gte: dados.dataInicio,
          },
        },
        select: {
          id: true,
        },
      })

    if (periodoSobreposto) {
      return {
        sucesso: false,
        motivo: 'PERIODO_SOBREPOSTO',
      } as const
    }

    const periodo =
      await transaction.periodoArranchamento.create({
        data: {
          dataInicio: dados.dataInicio,
          dataFim,
          abertoPorId,
        },
        include: dadosRelacionados,
      })

    return {
      sucesso: true,
      periodo,
    } as const
  })
}

export async function fecharPeriodo(
  id: number,
  fechadoPorId: number,
) {
  return prisma.$transaction(async (transaction) => {
    const periodo =
      await transaction.periodoArranchamento.findUnique({
        where: {
          id,
        },
      })

    if (!periodo) {
      return {
        sucesso: false,
        motivo: 'NAO_ENCONTRADO',
      } as const
    }

    if (periodo.status === 'FECHADO') {
      return {
        sucesso: false,
        motivo: 'JA_FECHADO',
      } as const
    }

    const periodoFechado =
      await transaction.periodoArranchamento.update({
        where: {
          id,
        },
        data: {
          status: 'FECHADO',
          fechadoPorId,
          fechadoEm: new Date(),
        },
        include: dadosRelacionados,
      })

    return {
      sucesso: true,
      periodo: periodoFechado,
    } as const
  })
}