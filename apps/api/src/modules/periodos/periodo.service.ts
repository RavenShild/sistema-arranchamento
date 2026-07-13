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

    const [arranchamentos, escalasServico, ferias] =
      await Promise.all([
        transaction.arranchamento.findMany({
          where: {
            periodoId: periodo.id,
          },
          select: {
            militarId: true,
            subunidadeId: true,
            data: true,
            refeicao: true,
          },
        }),
        transaction.escalaServico.findMany({
          where: {
            periodoId: periodo.id,
          },
          select: {
            militarId: true,
            subunidadeId: true,
            data: true,
          },
        }),
        transaction.feriasMilitar.findMany({
          where: {
            dataInicio: {
              lte: periodo.dataFim,
            },
            dataFim: {
              gte: periodo.dataInicio,
            },
          },
          select: {
            militarId: true,
            dataInicio: true,
            dataFim: true,
            laranjeira: true,
          },
        }),
      ])

    const datasGu = new Set(
      escalasServico.map(
        (escala) =>
          `${escala.militarId}|${escala.data.getTime()}`,
      ),
    )

    const consolidados = new Map<
      string,
      {
        periodoId: number
        subunidadeId: number
        data: Date
        refeicao: 'CAFE' | 'ALMOCO' | 'JANTA' | 'CEIA'
        militares: Set<number>
        individuais: Set<number>
        gu: Set<number>
      }
    >()

    function adicionarConsolidado(
      militarId: number,
      subunidadeId: number,
      data: Date,
      refeicao: 'CAFE' | 'ALMOCO' | 'JANTA' | 'CEIA',
      origem: 'INDIVIDUAL' | 'GU',
    ) {
      const chave =
        `${subunidadeId}|${data.getTime()}|${refeicao}`
      const existente = consolidados.get(chave)

      if (existente) {
        existente.militares.add(militarId)

        if (origem === 'GU') {
          existente.gu.add(militarId)
        } else {
          existente.individuais.add(militarId)
        }

        return
      }

      consolidados.set(chave, {
        periodoId: id,
        subunidadeId,
        data,
        refeicao,
        militares: new Set([militarId]),
        individuais:
          origem === 'INDIVIDUAL'
            ? new Set([militarId])
            : new Set(),
        gu:
          origem === 'GU'
            ? new Set([militarId])
            : new Set(),
      })
    }

    for (const arranchamento of arranchamentos) {
      const chaveGu =
        `${arranchamento.militarId}|${arranchamento.data.getTime()}`

      if (datasGu.has(chaveGu)) {
        continue
      }

      const feriasNaData = ferias.find(
        (registro) =>
          registro.militarId === arranchamento.militarId &&
          arranchamento.data >= registro.dataInicio &&
          arranchamento.data <= registro.dataFim,
      )

      if (feriasNaData && !feriasNaData.laranjeira) {
        continue
      }

      adicionarConsolidado(
        arranchamento.militarId,
        arranchamento.subunidadeId,
        arranchamento.data,
        arranchamento.refeicao,
        'INDIVIDUAL',
      )
    }

    const refeicoesGu = [
      'CAFE',
      'ALMOCO',
      'JANTA',
      'CEIA',
    ] as const

    for (const escala of escalasServico) {
      for (const refeicao of refeicoesGu) {
        adicionarConsolidado(
          escala.militarId,
          escala.subunidadeId,
          escala.data,
          refeicao,
          'GU',
        )
      }
    }

    await transaction.consolidadoRefeicao.deleteMany({
      where: {
        periodoId: periodo.id,
      },
    })

    const dadosConsolidados = [...consolidados.values()].map(
      (item) => ({
        periodoId: item.periodoId,
        subunidadeId: item.subunidadeId,
        data: item.data,
        refeicao: item.refeicao,
        quantidade: item.militares.size,
        quantidadeIndividual: item.individuais.size,
        quantidadeGu: item.gu.size,
      }),
    )

    if (dadosConsolidados.length > 0) {
      await transaction.consolidadoRefeicao.createMany({
        data: dadosConsolidados,
      })
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