import { z } from 'zod'

export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Informe sua identidade ou e-mail.'),
  senha: z.string().min(1, 'Informe sua senha.'),
})

export type LoginInput = z.infer<typeof loginSchema>