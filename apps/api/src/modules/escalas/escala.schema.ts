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

export const criarEscalaSchema = z.object({
  militarId: z.coerce.number().int().positive(),
  data: dataSchema,
})

export const escalaIdSchema = z.coerce
  .number()
  .int()
  .positive()

export type CriarEscalaInput = z.infer<
  typeof criarEscalaSchema
>