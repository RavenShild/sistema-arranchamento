import { z } from 'zod'

const dataFeriadoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')
  .refine((valor) => {
    const data = new Date(`${valor}T00:00:00.000Z`)

    return (
      !Number.isNaN(data.getTime()) &&
      data.toISOString().slice(0, 10) === valor
    )
  }, 'Informe uma data válida.')
  .transform((valor) => new Date(`${valor}T00:00:00.000Z`))

export const listarFeriadosSchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
  busca: z.string().trim().max(120).optional(),
})

export const criarFeriadoSchema = z.object({
  data: dataFeriadoSchema,
  descricao: z.string().trim().min(3).max(120),
})

export const atualizarFeriadoSchema = z
  .object({
    data: dataFeriadoSchema.optional(),
    descricao: z.string().trim().min(3).max(120).optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe pelo menos um campo.',
  })

export const feriadoIdSchema = z.coerce
  .number()
  .int()
  .positive()

export type ListarFeriadosInput = z.infer<
  typeof listarFeriadosSchema
>

export type CriarFeriadoInput = z.infer<
  typeof criarFeriadoSchema
>

export type AtualizarFeriadoInput = z.infer<
  typeof atualizarFeriadoSchema
>