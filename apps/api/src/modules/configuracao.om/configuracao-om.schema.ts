import { z } from 'zod'

export const postosComandante = [
  'General de Brigada',
  'Coronel',
  'Tenente-coronel',
  'Major',
  'Capitão',
] as const

export const salvarConfiguracaoOmSchema = z.object({
  nome: z.string().trim().min(3).max(160),
  sigla: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((valor) => valor.toUpperCase()),
  postoComandante: z.enum(postosComandante),
  nomeComandante: z.string().trim().min(3).max(160),
})

export type SalvarConfiguracaoOmInput = z.infer<
  typeof salvarConfiguracaoOmSchema
>