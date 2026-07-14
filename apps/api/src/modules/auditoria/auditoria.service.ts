import { prisma } from '../../lib/prisma.js'
import type { ListarAuditoriasInput } from './auditoria.schema.js'

type JsonPrimitivo = string | number | boolean | null

export type JsonSeguro =
  | JsonPrimitivo
  | JsonSeguro[]
  | { [chave: string]: JsonSeguro }

export type JsonSeguroRaiz = Exclude<JsonSeguro, null>

type RegistrarAuditoriaInput = {
  usuarioId: number
  acao: 'CRIACAO' | 'ALTERACAO' | 'EXCLUSAO'
  recurso: string
  recursoId?: string
  metodo: string
  rota: string
  statusHttp: number
  dados?: JsonSeguroRaiz
  ip?: string
  userAgent?: string
}

function inicioDoDia(data: string) {
  return new Date(`${data}T00:00:00.000Z`)
}

function fimDoDia(data: string) {
  return new Date(`${data}T23:59:59.999Z`)
}

export async function registrarAuditoria(
  dados: RegistrarAuditoriaInput,
) {
  return prisma.auditoria.create({
    data: {
      usuarioId: dados.usuarioId,
      acao: dados.acao,
      recurso: dados.recurso,
      recursoId: dados.recursoId,
      metodo: dados.metodo,
      rota: dados.rota,
      statusHttp: dados.statusHttp,
      dados: dados.dados,
      ip: dados.ip,
      userAgent: dados.userAgent,
    },
  })
}

export async function listarAuditorias(
  filtros: ListarAuditoriasInput,
) {
  const where = {
    acao: filtros.acao,
    recurso: filtros.recurso,
    usuarioId: filtros.usuarioId,
    ...(filtros.dataInicio || filtros.dataFim
      ? {
          createdAt: {
            gte: filtros.dataInicio
              ? inicioDoDia(filtros.dataInicio)
              : undefined,
            lte: filtros.dataFim
              ? fimDoDia(filtros.dataFim)
              : undefined,
          },
        }
      : {}),
  }

  const [total, auditorias] = await prisma.$transaction([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            militar: {
              select: {
                identidadeMilitar: true,
                nomeGuerra: true,
                postoGraduacao: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      skip: (filtros.pagina - 1) * filtros.limite,
      take: filtros.limite,
    }),
  ])

  return {
    auditorias,
    paginacao: {
      pagina: filtros.pagina,
      limite: filtros.limite,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / filtros.limite)),
    },
  }
}