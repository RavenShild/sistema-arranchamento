import { z } from 'zod'

export const codigosPerfil = [
  'MILITAR',
  'FURRIEL',
  'APROVISIONAMENTO',
  'SARGENTEANTE',
  'ADMINISTRADOR',
] as const

const codigoPerfilSchema = z.enum(codigosPerfil)

const emailOpcionalSchema = z
  .union([
    z
      .string()
      .trim()
      .toLowerCase()
      .email('Informe um e-mail válido.')
      .max(160),
    z.literal(''),
    z.null(),
  ])
  .transform((valor) => valor || null)

const perfisSchema = z
  .array(codigoPerfilSchema)
  .min(1, 'Selecione pelo menos um perfil.')
  .max(codigosPerfil.length)
  .transform((perfis) => [...new Set(perfis)])

export const listarUsuariosSchema = z.object({
  busca: z.string().trim().max(160).optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
})

export const criarUsuarioSchema = z.object({
  militarId: z.coerce.number().int().positive(),
  email: emailOpcionalSchema.optional().default(null),
  perfis: perfisSchema,
})

export const atualizarUsuarioSchema = z
  .object({
    email: emailOpcionalSchema.optional(),
    ativo: z.boolean().optional(),
    perfis: perfisSchema.optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe pelo menos um campo.',
  })

export const usuarioIdSchema = z.coerce
  .number()
  .int()
  .positive()

export type ListarUsuariosInput = z.infer<
  typeof listarUsuariosSchema
>

export type CriarUsuarioInput = z.infer<
  typeof criarUsuarioSchema
>

export type AtualizarUsuarioInput = z.infer<
  typeof atualizarUsuarioSchema
>