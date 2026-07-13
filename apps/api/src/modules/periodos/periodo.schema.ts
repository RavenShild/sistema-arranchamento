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

export const criarPeriodoSchema = z.object({
  dataInicio: dataSchema.refine(
    (data) => data.getUTCDay() === 4,
    {
      message: 'O período deve iniciar em uma quinta-feira.',
    },
  ),
})

export const listarPeriodosSchema = z.object({
  status: z.enum(['ABERTO', 'FECHADO']).optional(),
})

export const periodoIdSchema = z.coerce
  .number()
  .int()
  .positive()

export type CriarPeriodoInput = z.infer<
  typeof criarPeriodoSchema
>

export type ListarPeriodosInput = z.infer<
  typeof listarPeriodosSchema
>