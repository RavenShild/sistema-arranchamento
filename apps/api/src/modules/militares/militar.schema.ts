import { z } from 'zod'

export const situacoesMilitar = [
  'ATIVO',
  'AFASTADO',
  'TRANSFERIDO',
  'RESERVA',
] as const

export const situacaoMilitarSchema = z.enum(
  situacoesMilitar,
)

export const criarMilitarSchema = z.object({
  identidadeMilitar: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .transform((valor) => valor.toUpperCase()),
  nomeCompleto: z.string().trim().min(3).max(160),
  nomeGuerra: z.string().trim().min(2).max(80),
  postoGraduacao: z.string().trim().min(2).max(50),
  situacao: situacaoMilitarSchema.optional(),
  subunidadeId: z.coerce.number().int().positive(),
})

export const atualizarMilitarSchema = z
  .object({
    identidadeMilitar: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .transform((valor) => valor.toUpperCase())
      .optional(),
    nomeCompleto: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .optional(),
    nomeGuerra: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .optional(),
    postoGraduacao: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .optional(),
    situacao: situacaoMilitarSchema.optional(),
    subunidadeId: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe pelo menos um campo.',
  })

export const listarMilitaresSchema = z.object({
  busca: z.string().trim().max(160).optional(),
  situacao: situacaoMilitarSchema.optional(),
  subunidadeId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
})

export const militarIdSchema = z.coerce
  .number()
  .int()
  .positive()

export type CriarMilitarInput = z.infer<
  typeof criarMilitarSchema
>

export type AtualizarMilitarInput = z.infer<
  typeof atualizarMilitarSchema
>

export type ListarMilitaresInput = z.infer<
  typeof listarMilitaresSchema
>