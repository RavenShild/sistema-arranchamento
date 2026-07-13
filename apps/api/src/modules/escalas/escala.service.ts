import { prisma } from '../../lib/prisma.js'
import type { CriarEscalaInput } from './escala.schema.js'

const dadosEscala = {
  militar: {
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
  },
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

export async function obterEscopoEscala(
  usuarioId: number,
  permissoes: string[],
) {
  if (permissoes.includes('militar:gerenciar')) {
    return {
      sucesso: true,
      subunidadeId: undefined,
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
  } as const
}

export async function obterContextoEscala(
  subunidadeId?: number,
) {
  const periodo = await prisma.periodoArranchamento.findFirst({
    where: {
      status: 'ABERTO',
    },
    orderBy: {
      dataInicio: 'desc',
    },
  })

  const militares = await prisma.militar.findMany({
    where: {
      subunidadeId,
      situacao: 'ATIVO',
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
  })

  const escalas = periodo
    ? await prisma.escalaServico.findMany({
        where: {
          periodoId: periodo.id,
          subunidadeId,
        },
        include: dadosEscala,
        orderBy: [
          {
            data: 'asc',
          },
          {
            militar: {
              nomeGuerra: 'asc',
            },
          },
        ],
      })
    : []

  return {
    periodo,
    militares,
    escalas,
  }
}

export async function criarEscala(
  dados: CriarEscalaInput,
  cadastradoPorId: number,
  subunidadeId?: number,
) {
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

  if (
    dados.data < periodo.dataInicio ||
    dados.data > periodo.dataFim
  ) {
    return {
      sucesso: false,
      motivo: 'DATA_FORA_DO_PERIODO',
    } as const
  }

  const militar = await prisma.militar.findFirst({
    where: {
      id: dados.militarId,
      subunidadeId,
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

  const ferias = await prisma.feriasMilitar.findFirst({
    where: {
      militarId: militar.id,
      dataInicio: {
        lte: dados.data,
      },
      dataFim: {
        gte: dados.data,
      },
    },
    select: {
      id: true,
    },
  })

  if (ferias) {
    return {
      sucesso: false,
      motivo: 'MILITAR_EM_FERIAS',
    } as const
  }

  const existente = await prisma.escalaServico.findUnique({
    where: {
      militarId_data: {
        militarId: militar.id,
        data: dados.data,
      },
    },
  })

  if (existente) {
    return {
      sucesso: false,
      motivo: 'ESCALA_EXISTENTE',
    } as const
  }

  const escala = await prisma.escalaServico.create({
    data: {
      periodoId: periodo.id,
      militarId: militar.id,
      subunidadeId: militar.subunidadeId,
      data: dados.data,
      cadastradoPorId,
    },
    include: dadosEscala,
  })

  return {
    sucesso: true,
    escala,
  } as const
}

export async function excluirEscala(
  id: number,
  subunidadeId?: number,
) {
  const escala = await prisma.escalaServico.findFirst({
    where: {
      id,
      subunidadeId,
    },
    include: {
      periodo: {
        select: {
          status: true,
        },
      },
    },
  })

  if (!escala) {
    return {
      sucesso: false,
      motivo: 'NAO_ENCONTRADA',
    } as const
  }

  if (escala.periodo.status === 'FECHADO') {
    return {
      sucesso: false,
      motivo: 'PERIODO_FECHADO',
    } as const
  }

  await prisma.escalaServico.delete({
    where: {
      id,
    },
  })

  return {
    sucesso: true,
  } as const
}