import { z } from 'zod'

export const acoesAuditoria = [
  'CRIACAO',
  'ALTERACAO',
  'EXCLUSAO',
] as const

const dataIsoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()

export const listarAuditoriasSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
  acao: z.enum(acoesAuditoria).optional(),
  recurso: z.string().trim().min(1).max(80).optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  dataInicio: dataIsoSchema,
  dataFim: dataIsoSchema,
})

export type ListarAuditoriasInput = z.infer<
  typeof listarAuditoriasSchema
>