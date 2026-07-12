import { z } from 'zod'

export const criarSubunidadeSchema = z.object({
  sigla: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .transform((valor) => valor.toUpperCase()),
  nome: z.string().trim().min(3).max(120),
})

export const atualizarSubunidadeSchema = z
  .object({
    sigla: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .transform((valor) => valor.toUpperCase())
      .optional(),
    nome: z.string().trim().min(3).max(120).optional(),
    ativa: z.boolean().optional(),
  })
  .refine(
    (dados) => Object.keys(dados).length > 0,
    {
      message: 'Informe pelo menos um campo.',
    },
  )

export const subunidadeIdSchema = z.coerce
  .number()
  .int()
  .positive()

export type CriarSubunidadeInput = z.infer<
  typeof criarSubunidadeSchema
>

export type AtualizarSubunidadeInput = z.infer<
  typeof atualizarSubunidadeSchema
>