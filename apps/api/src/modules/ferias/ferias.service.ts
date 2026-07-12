import { prisma } from '../../lib/prisma.js'
import type {
  AtualizarFeriasInput,
  CriarFeriasInput,
  ListarFeriasInput,
} from './ferias.schema.js'

const dadosRelacionados = {
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

function inicioDeHojeUtc() {
  const agora = new Date()

  return new Date(
    Date.UTC(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate(),
    ),
  )
}

async function existeSobreposicao(
  militarId: number,
  dataInicio: Date,
  dataFim: Date,
  ignorarId?: number,
) {
  const registro = await prisma.feriasMilitar.findFirst({
    where: {
      militarId,
      dataInicio: {
        lte: dataFim,
      },
      dataFim: {
        gte: dataInicio,
      },
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

  return Boolean(registro)
}

export async function listarFerias(
  filtros: ListarFeriasInput,
) {
  return prisma.feriasMilitar.findMany({
    where: {
      militarId: filtros.militarId,
      ...(filtros.data
        ? {
            dataInicio: {
              lte: filtros.data,
            },
            dataFim: {
              gte: filtros.data,
            },
          }
        : {}),
    },
    include: dadosRelacionados,
    orderBy: [
      {
        dataInicio: 'desc',
      },
      {
        militarId: 'asc',
      },
    ],
  })
}

export async function criarFerias(
  dados: CriarFeriasInput,
  cadastradoPorId: number,
) {
  const militar = await prisma.militar.findUnique({
    where: {
      id: dados.militarId,
    },
    select: {
      id: true,
    },
  })

  if (!militar) {
    return {
      sucesso: false,
      motivo: 'MILITAR_NAO_ENCONTRADO',
    } as const
  }

  const sobreposicao = await existeSobreposicao(
    dados.militarId,
    dados.dataInicio,
    dados.dataFim,
  )

  if (sobreposicao) {
    return {
      sucesso: false,
      motivo: 'PERIODO_SOBREPOSTO',
    } as const
  }

  const ferias = await prisma.feriasMilitar.create({
    data: {
      ...dados,
      cadastradoPorId,
    },
    include: dadosRelacionados,
  })

  return {
    sucesso: true,
    ferias,
  } as const
}

export async function atualizarFerias(
  id: number,
  dados: AtualizarFeriasInput,
) {
  const existente = await prisma.feriasMilitar.findUnique({
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

  const militarId = dados.militarId ?? existente.militarId
  const dataInicio = dados.dataInicio ?? existente.dataInicio
  const dataFim = dados.dataFim ?? existente.dataFim

  if (dataFim < dataInicio) {
    return {
      sucesso: false,
      motivo: 'PERIODO_INVALIDO',
    } as const
  }

  if (dados.militarId) {
    const militar = await prisma.militar.findUnique({
      where: {
        id: militarId,
      },
      select: {
        id: true,
      },
    })

    if (!militar) {
      return {
        sucesso: false,
        motivo: 'MILITAR_NAO_ENCONTRADO',
      } as const
    }
  }

  const sobreposicao = await existeSobreposicao(
    militarId,
    dataInicio,
    dataFim,
    id,
  )

  if (sobreposicao) {
    return {
      sucesso: false,
      motivo: 'PERIODO_SOBREPOSTO',
    } as const
  }

  const ferias = await prisma.feriasMilitar.update({
    where: {
      id,
    },
    data: dados,
    include: dadosRelacionados,
  })

  return {
    sucesso: true,
    ferias,
  } as const
}

export async function excluirFerias(id: number) {
  const existente = await prisma.feriasMilitar.findUnique({
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

  if (existente.dataInicio <= inicioDeHojeUtc()) {
    return {
      sucesso: false,
      motivo: 'PERIODO_INICIADO',
    } as const
  }

  await prisma.feriasMilitar.delete({
    where: {
      id,
    },
  })

  return {
    sucesso: true,
  } as const
}

export async function listarMilitaresParaFerias() {
  return prisma.militar.findMany({
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
    orderBy: {
      nomeGuerra: 'asc',
    },
  })
}