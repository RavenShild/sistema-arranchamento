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

const itemArranchamentoSchema = z.object({
  data: dataSchema,
  refeicao: z.enum(['CAFE', 'ALMOCO', 'JANTA']),
})

export const salvarArranchamentoSchema = z
  .object({
    itens: z.array(itemArranchamentoSchema).max(21),
  })
  .superRefine((dados, contexto) => {
    const chaves = new Set<string>()

    dados.itens.forEach((item, indice) => {
      const chave = `${item.data.toISOString()}-${item.refeicao}`

      if (chaves.has(chave)) {
        contexto.addIssue({
          code: 'custom',
          message: 'A mesma refeição foi informada mais de uma vez.',
          path: ['itens', indice],
        })
      }

      chaves.add(chave)
    })
  })

export type SalvarArranchamentoInput = z.infer<
  typeof salvarArranchamentoSchema
>