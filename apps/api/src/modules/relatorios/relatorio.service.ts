import { prisma } from '../../lib/prisma.js'

const refeicoesGu = ['CAFE', 'ALMOCO', 'JANTA', 'CEIA'] as const

const ordemPostos = [
  'General de Brigada',
  'Coronel',
  'Tenente-coronel',
  'Major',
  'Capitão',
  '1º Tenente',
  '2º Tenente',
  'Aspirante a Oficial',
  'Subtenente',
  '1º Sargento',
  '2º Sargento',
  '3º Sargento',
  'Al CFST',
  'Cb',
  'Sd EP',
  'Sd EV',
] as const

type Circulo = 'OFICIAIS' | 'ST_SGT' | 'CB_SD'
type Refeicao = (typeof refeicoesGu)[number]

function converterDataIso(data: string) {
  return new Date(`${data}T00:00:00.000Z`)
}

function obterCirculo(postoGraduacao: string): Circulo {
  if (
    [
      'General de Brigada',
      'Coronel',
      'Tenente-coronel',
      'Major',
      'Capitão',
      '1º Tenente',
      '2º Tenente',
      'Aspirante a Oficial',
    ].includes(postoGraduacao)
  ) {
    return 'OFICIAIS'
  }

  if (
    [
      'Subtenente',
      '1º Sargento',
      '2º Sargento',
      '3º Sargento',
      'Al CFST',
    ].includes(postoGraduacao)
  ) {
    return 'ST_SGT'
  }

  return 'CB_SD'
}

function obterOrdemPosto(postoGraduacao: string) {
  const indice = ordemPostos.indexOf(
    postoGraduacao as (typeof ordemPostos)[number],
  )

  return indice === -1 ? ordemPostos.length : indice
}

export async function obterEscopoRelatorio(
  usuarioId: number,
  permissoes: string[],
) {
  if (permissoes.includes('relatorio:global:ler')) {
    return {
      sucesso: true,
      subunidadeId: undefined,
      global: true,
    } as const
  }

  if (!permissoes.includes('relatorio:subunidade:ler')) {
    return {
      sucesso: false,
    } as const
  }

  const usuario = await prisma.usuario.findUnique({
    where: {
      id: usuarioId,
    },
    select: {
      militar: {
        select: {
          subunidadeId: true,
        },
      },
    },
  })

  if (!usuario) {
    return {
      sucesso: false,
    } as const
  }

  return {
    sucesso: true,
    subunidadeId: usuario.militar.subunidadeId,
    global: false,
  } as const
}

export async function listarPeriodosParaRelatorio() {
  return prisma.periodoArranchamento.findMany({
    where: {
      status: 'FECHADO',
    },
    select: {
      id: true,
      dataInicio: true,
      dataFim: true,
      status: true,
      fechadoEm: true,
      fechadoPor: {
        select: {
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
          consolidados: true,
        },
      },
    },
    orderBy: {
      dataInicio: 'desc',
    },
  })
}

export async function listarSubunidadesParaRelatorio(
  subunidadeId?: number,
) {
  return prisma.subunidade.findMany({
    where: {
      ativa: true,
      ...(subunidadeId ? { id: subunidadeId } : {}),
    },
    select: {
      id: true,
      sigla: true,
      nome: true,
    },
    orderBy: {
      sigla: 'asc',
    },
  })
}

export async function obterRelatorioConsolidado(
  periodoId: number,
  subunidadeId?: number,
) {
  const periodo = await prisma.periodoArranchamento.findUnique({
    where: {
      id: periodoId,
    },
    select: {
      id: true,
      dataInicio: true,
      dataFim: true,
      status: true,
      fechadoEm: true,
    },
  })

  if (!periodo) {
    return {
      sucesso: false,
      motivo: 'PERIODO_NAO_ENCONTRADO',
    } as const
  }

  if (periodo.status !== 'FECHADO') {
    return {
      sucesso: false,
      motivo: 'PERIODO_NAO_FECHADO',
    } as const
  }

  const consolidados = await prisma.consolidadoRefeicao.findMany({
    where: {
      periodoId,
      ...(subunidadeId ? { subunidadeId } : {}),
    },
    select: {
      id: true,
      data: true,
      refeicao: true,
      quantidade: true,
      quantidadeIndividual: true,
      quantidadeGu: true,
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
        data: 'asc',
      },
      {
        refeicao: 'asc',
      },
      {
        subunidade: {
          sigla: 'asc',
        },
      },
    ],
  })

  const totaisPorData = new Map<
    string,
    {
      data: Date
      refeicao: Refeicao
      quantidade: number
      quantidadeIndividual: number
      quantidadeGu: number
    }
  >()

  for (const item of consolidados) {
    const chave = `${item.data.getTime()}|${item.refeicao}`
    const existente = totaisPorData.get(chave)

    if (existente) {
      existente.quantidade += item.quantidade
      existente.quantidadeIndividual +=
        item.quantidadeIndividual
      existente.quantidadeGu += item.quantidadeGu
      continue
    }

    totaisPorData.set(chave, {
      data: item.data,
      refeicao: item.refeicao,
      quantidade: item.quantidade,
      quantidadeIndividual: item.quantidadeIndividual,
      quantidadeGu: item.quantidadeGu,
    })
  }

  return {
    sucesso: true,
    periodo,
    consolidados,
    totaisPorData: [...totaisPorData.values()],
    totalEtapas: consolidados.reduce(
      (total, item) => total + item.quantidade,
      0,
    ),
  } as const
}

export async function obterRelatorioDiario(
  periodoId: number,
  dataIso: string,
  subunidadeId?: number,
) {
  const data = converterDataIso(dataIso)

  const periodo = await prisma.periodoArranchamento.findUnique({
    where: {
      id: periodoId,
    },
    select: {
      id: true,
      dataInicio: true,
      dataFim: true,
      status: true,
      fechadoEm: true,
      fechadoPor: {
        select: {
          militar: {
            select: {
              nomeGuerra: true,
              nomeCompleto: true,
              postoGraduacao: true,
            },
          },
        },
      },
    },
  })

  if (!periodo) {
    return {
      sucesso: false,
      motivo: 'PERIODO_NAO_ENCONTRADO',
    } as const
  }

  if (periodo.status !== 'FECHADO') {
    return {
      sucesso: false,
      motivo: 'PERIODO_NAO_FECHADO',
    } as const
  }

  if (data < periodo.dataInicio || data > periodo.dataFim) {
    return {
      sucesso: false,
      motivo: 'DATA_FORA_PERIODO',
    } as const
  }

  const filtroMilitar = {
    situacao: 'ATIVO' as const,
    ...(subunidadeId ? { subunidadeId } : {}),
  }

  const [
    militaresCadastrados,
    arranchamentos,
    escalas,
    ferias,
    feriado,
  ] = await Promise.all([
    prisma.militar.findMany({
      where: filtroMilitar,
      select: {
        id: true,
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
    }),
    prisma.arranchamento.findMany({
      where: {
        periodoId,
        data,
        ...(subunidadeId ? { subunidadeId } : {}),
      },
      select: {
        militarId: true,
        refeicao: true,
      },
    }),
    prisma.escalaServico.findMany({
      where: {
        periodoId,
        data,
        ...(subunidadeId ? { subunidadeId } : {}),
      },
      select: {
        militarId: true,
      },
    }),
    prisma.feriasMilitar.findMany({
      where: {
        militar: filtroMilitar,
        dataInicio: {
          lte: data,
        },
        dataFim: {
          gte: data,
        },
      },
      select: {
        militarId: true,
        laranjeira: true,
      },
    }),
    prisma.feriado.findUnique({
      where: {
        data,
      },
      select: {
        descricao: true,
      },
    }),
  ])

  const refeicoesPorMilitar = new Map<number, Set<Refeicao>>()

  for (const arranchamento of arranchamentos) {
    const refeicoes =
      refeicoesPorMilitar.get(arranchamento.militarId) ??
      new Set<Refeicao>()

    refeicoes.add(arranchamento.refeicao)
    refeicoesPorMilitar.set(arranchamento.militarId, refeicoes)
  }

  const militaresGu = new Set(
    escalas.map((escala) => escala.militarId),
  )
  const feriasPorMilitar = new Map(
    ferias.map((registro) => [
      registro.militarId,
      registro.laranjeira,
    ]),
  )

  const militares = militaresCadastrados
    .map((militar) => {
      const guServico = militaresGu.has(militar.id)
      const possuiFerias = feriasPorMilitar.has(militar.id)
      const laranjeira =
        feriasPorMilitar.get(militar.id) ?? false
      const refeicoes = guServico
        ? new Set<Refeicao>(refeicoesGu)
        : possuiFerias && !laranjeira
          ? new Set<Refeicao>()
          : (refeicoesPorMilitar.get(militar.id) ??
            new Set<Refeicao>())

      return {
        ...militar,
        circulo: obterCirculo(militar.postoGraduacao),
        ordemPosto: obterOrdemPosto(militar.postoGraduacao),
        refeicoes: {
          CAFE: refeicoes.has('CAFE'),
          ALMOCO: refeicoes.has('ALMOCO'),
          JANTA: refeicoes.has('JANTA'),
          CEIA: refeicoes.has('CEIA'),
        },
        origem: guServico
          ? ('GU_SERVICO' as const)
          : refeicoes.size > 0
            ? ('INDIVIDUAL' as const)
            : ('NENHUMA' as const),
        situacaoDia: possuiFerias
          ? laranjeira
            ? ('LARANJEIRA' as const)
            : ('FERIAS' as const)
          : ('NORMAL' as const),
      }
    })
    .sort((a, b) => {
      if (a.circulo !== b.circulo) {
        const ordemCirculo: Record<Circulo, number> = {
          OFICIAIS: 0,
          ST_SGT: 1,
          CB_SD: 2,
        }

        return ordemCirculo[a.circulo] - ordemCirculo[b.circulo]
      }

      if (a.ordemPosto !== b.ordemPosto) {
        return a.ordemPosto - b.ordemPosto
      }

      return a.nomeGuerra.localeCompare(b.nomeGuerra, 'pt-BR')
    })

  const criarLinhaResumo = (circulo: Circulo | 'TOTAL') => {
    const registros =
      circulo === 'TOTAL'
        ? militares
        : militares.filter((militar) => militar.circulo === circulo)

    return {
      circulo,
      efetivo: registros.length,
      CAFE: registros.filter((militar) => militar.refeicoes.CAFE)
        .length,
      ALMOCO: registros.filter(
        (militar) => militar.refeicoes.ALMOCO,
      ).length,
      JANTA: registros.filter((militar) => militar.refeicoes.JANTA)
        .length,
      CEIA: registros.filter((militar) => militar.refeicoes.CEIA)
        .length,
    }
  }

  const resumo = [
    criarLinhaResumo('OFICIAIS'),
    criarLinhaResumo('ST_SGT'),
    criarLinhaResumo('CB_SD'),
    criarLinhaResumo('TOTAL'),
  ]

  return {
    sucesso: true,
    periodo,
    dia: {
      data,
      fimDeSemana: data.getUTCDay() === 0 || data.getUTCDay() === 6,
      feriado: feriado?.descricao ?? null,
    },
    militares,
    resumo,
    totalEtapas: resumo.at(-1)!.CAFE +
      resumo.at(-1)!.ALMOCO +
      resumo.at(-1)!.JANTA +
      resumo.at(-1)!.CEIA,
  } as const
}