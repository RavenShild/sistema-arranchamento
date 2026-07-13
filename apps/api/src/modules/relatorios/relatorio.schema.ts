import { z } from 'zod'

const dataIsoSchema = z.coerce.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'A data deve estar no formato AAAA-MM-DD.',
)

export const periodoRelatorioIdSchema = z.coerce
  .number()
  .int()
  .positive()

export const relatorioDiarioParamsSchema = z.object({
  id: periodoRelatorioIdSchema,
  data: dataIsoSchema,
})

export const relatorioDiarioQuerySchema = z.object({
  subunidadeId: z.coerce.number().int().positive().optional(),
})