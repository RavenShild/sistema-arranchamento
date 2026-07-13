import { prisma } from '../../lib/prisma.js'
import type { SalvarArranchamentoInput } from './arranchamento.schema.js'

async function obterUsuarioMilitar(usuarioId: number) {
  return prisma.usuario.findUnique({
    where: {
      id: usuarioId,
    },
    select: {
      id: true,
      ativo: true,
      militar: {
        select: {
          id: true,
          identidadeMilitar: true,
          nomeGuerra: true,
          nomeCompleto: true,
          postoGraduacao: true,
          situacao: true,
          subunidadeId: true,
          subunidade: {
            select: {
              id: true,
              sigla: true,
              nome: true,
            },
          },
        },
      },
    },
  })
}

export async function obterMeuArranchamento(
  usuarioId: number,
) {
  const usuario = await obterUsuarioMilitar(usuarioId)

  if (!usuario || !usuario.ativo) {
    return {
      sucesso: false,
      motivo: 'USUARIO_NAO_ENCONTRADO',
    } as const
  }

  const periodo = await prisma.periodoArranchamento.findFirst({
    where: {
      status: 'ABERTO',
    },
    orderBy: {
      dataInicio: 'desc',
    },
  })

  if (!periodo) {
    return {
      sucesso: true,
      usuario: usuario.militar,
      periodo: null,
      arranchamentos: [],
      escalasServico: [],
      ferias: [],
      feriados: [],
    } as const
  }

  const [arranchamentos, escalasServico, ferias, feriados] =
    await Promise.all([
      prisma.arranchamento.findMany({
        where: {
          periodoId: periodo.id,
          militarId: usuario.militar.id,
        },
        select: {
          id: true,
          data: true,
          refeicao: true,
        },
        orderBy: [
          {
            data: 'asc',
          },
          {
            refeicao: 'asc',
          },
        ],
      }),
      prisma.escalaServico.findMany({
        where: {
          periodoId: periodo.id,
          militarId: usuario.militar.id,
        },
        select: {
          id: true,
          data: true,
        },
        orderBy: {
          data: 'asc',
        },
      }),
      prisma.feriasMilitar.findMany({
        where: {
          militarId: usuario.militar.id,
          dataInicio: {
            lte: periodo.dataFim,
          },
          dataFim: {
            gte: periodo.dataInicio,
          },
        },
        select: {
          id: true,
          dataInicio: true,
          dataFim: true,
          laranjeira: true,
        },
        orderBy: {
          dataInicio: 'asc',
        },
      }),
      prisma.feriado.findMany({
        where: {
          data: {
            gte: periodo.dataInicio,
            lte: periodo.dataFim,
          },
        },
        select: {
          id: true,
          data: true,
          descricao: true,
        },
        orderBy: {
          data: 'asc',
        },
      }),
    ])

  return {
    sucesso: true,
    usuario: usuario.militar,
    periodo,
    arranchamentos,
    escalasServico,
    ferias,
    feriados,
  } as const
}

export async function salvarMeuArranchamento(
  usuarioId: number,
  dados: SalvarArranchamentoInput,
) {
  const usuario = await obterUsuarioMilitar(usuarioId)

  if (!usuario || !usuario.ativo) {
    return {
      sucesso: false,
      motivo: 'USUARIO_NAO_ENCONTRADO',
    } as const
  }

  if (usuario.militar.situacao !== 'ATIVO') {
    return {
      sucesso: false,
      motivo: 'MILITAR_INATIVO',
    } as const
  }

  const periodo = await prisma.periodoArranchamento.findFirst({
    where: {
      status: 'ABERTO',
    },
  })

  if (!periodo) {
    return {
      sucesso: false,
      motivo: 'PERIODO_NAO_ENCONTRADO',
    } as const
  }

  const dataForaDoPeriodo = dados.itens.some(
    (item) =>
      item.data < periodo.dataInicio ||
      item.data > periodo.dataFim,
  )

  if (dataForaDoPeriodo) {
    return {
      sucesso: false,
      motivo: 'DATA_FORA_DO_PERIODO',
    } as const
  }

  const [escalasServico, ferias] = await Promise.all([
    prisma.escalaServico.findMany({
      where: {
        periodoId: periodo.id,
        militarId: usuario.militar.id,
      },
      select: {
        data: true,
      },
    }),
    prisma.feriasMilitar.findMany({
      where: {
        militarId: usuario.militar.id,
        dataInicio: {
          lte: periodo.dataFim,
        },
        dataFim: {
          gte: periodo.dataInicio,
        },
      },
      select: {
        dataInicio: true,
        dataFim: true,
        laranjeira: true,
      },
    }),
  ])

  const datasServico = new Set(
    escalasServico.map((escala) => escala.data.getTime()),
  )

  const itemEmDiaDeServico = dados.itens.some((item) =>
    datasServico.has(item.data.getTime()),
  )

  if (itemEmDiaDeServico) {
    return {
      sucesso: false,
      motivo: 'DATA_GU_SERVICO',
    } as const
  }

  const itemBloqueadoPorFerias = dados.itens.some((item) =>
    ferias.some(
      (registro) =>
        !registro.laranjeira &&
        item.data >= registro.dataInicio &&
        item.data <= registro.dataFim,
    ),
  )

  if (itemBloqueadoPorFerias) {
    return {
      sucesso: false,
      motivo: 'FERIAS_NAO_LARANJEIRA',
    } as const
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.arranchamento.deleteMany({
      where: {
        periodoId: periodo.id,
        militarId: usuario.militar.id,
      },
    })

    if (dados.itens.length > 0) {
      await transaction.arranchamento.createMany({
        data: dados.itens.map((item) => ({
          periodoId: periodo.id,
          militarId: usuario.militar.id,
          subunidadeId: usuario.militar.subunidadeId,
          data: item.data,
          refeicao: item.refeicao,
        })),
      })
    }
  })

  return {
    sucesso: true,
    quantidade: dados.itens.length,
  } as const
}