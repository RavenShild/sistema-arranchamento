import { prisma } from '../../lib/prisma.js'
import type { SalvarConfiguracaoOmInput } from './configuracao-om.schema.js'

const dadosRelacionados = {
  atualizadoPor: {
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

export async function obterConfiguracaoOm() {
  return prisma.configuracaoOm.findUnique({
    where: {
      id: 1,
    },
    include: dadosRelacionados,
  })
}

export async function salvarConfiguracaoOm(
  dados: SalvarConfiguracaoOmInput,
  atualizadoPorId: number,
) {
  return prisma.configuracaoOm.upsert({
    where: {
      id: 1,
    },
    update: {
      ...dados,
      atualizadoPorId,
    },
    create: {
      id: 1,
      ...dados,
      atualizadoPorId,
    },
    include: dadosRelacionados,
  })
}