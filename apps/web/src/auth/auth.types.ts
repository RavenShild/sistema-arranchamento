export type Usuario = {
  id: number
  nomeCompleto: string
  nomeGuerra: string
  postoGraduacao: string
  subunidade: string
  primeiroAcesso: boolean
  perfis: string[]
  permissoes: string[]
}

export type AuthResponse = {
  accessToken: string
  expiresIn: number
  usuario: Usuario
}