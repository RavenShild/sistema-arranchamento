import { z } from 'zod'

export const loginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, 'Informe sua identidade militar.')
    .max(30, 'A identidade deve possuir no máximo 30 caracteres.')
    .transform((valor) => valor.toUpperCase()),
  senha: z.string().min(1, 'Informe sua senha.'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const alterarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual.'),
    novaSenha: z
      .string()
      .min(12, 'A nova senha deve possuir pelo menos 12 caracteres.')
      .max(128, 'A nova senha deve possuir no máximo 128 caracteres.')
      .regex(/[A-Z]/, 'Inclua pelo menos uma letra maiúscula.')
      .regex(/[a-z]/, 'Inclua pelo menos uma letra minúscula.')
      .regex(/[0-9]/, 'Inclua pelo menos um número.')
      .regex(
        /[^A-Za-z0-9]/,
        'Inclua pelo menos um caractere especial.',
      ),
    confirmacaoSenha: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine(
    (dados) => dados.novaSenha === dados.confirmacaoSenha,
    {
      message: 'A confirmação não corresponde à nova senha.',
      path: ['confirmacaoSenha'],
    },
  )

export type AlterarSenhaInput = z.infer<
  typeof alterarSenhaSchema
>