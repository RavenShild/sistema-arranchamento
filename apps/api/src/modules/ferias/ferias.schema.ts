import { z } from 'zod'

function converterData(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`)
}

const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Informe a data no formato AAAA-MM-DD.',
  })
  .refine(
    (valor) => {
      const data = converterData(valor)

      return (
        !Number.isNaN(data.getTime()) &&
        data.toISOString().slice(0, 10) === valor
      )
    },
    {
      message: 'Informe uma data válida.',
    },
  )
  .transform(converterData)

export const criarFeriasSchema = z
  .object({
    militarId: z.coerce.number().int().positive(),
    dataInicio: dataSchema,
    dataFim: dataSchema,
    laranjeira: z.boolean().default(false),
  })
  .refine(
    (dados) => dados.dataFim >= dados.dataInicio,
    {
      message:
        'A data final deve ser igual ou posterior à data inicial.',
      path: ['dataFim'],
    },
  )

export const atualizarFeriasSchema = z
  .object({
    militarId: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    dataInicio: dataSchema.optional(),
    dataFim: dataSchema.optional(),
    laranjeira: z.boolean().optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe pelo menos um campo.',
  })
  .refine(
    (dados) =>
      !dados.dataInicio ||
      !dados.dataFim ||
      dados.dataFim >= dados.dataInicio,
    {
      message:
        'A data final deve ser igual ou posterior à data inicial.',
      path: ['dataFim'],
    },
  )

export const listarFeriasSchema = z.object({
  militarId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  data: dataSchema.optional(),
})

export const feriasIdSchema = z.coerce
  .number()
  .int()
  .positive()

export type CriarFeriasInput = z.infer<
  typeof criarFeriasSchema
>

export type AtualizarFeriasInput = z.infer<
  typeof atualizarFeriasSchema
>

export type ListarFeriasInput = z.infer<
  typeof listarFeriasSchema
>