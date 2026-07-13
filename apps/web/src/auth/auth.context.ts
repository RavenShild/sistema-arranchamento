import {
  createContext,
  useContext,
} from 'react'
import type { Usuario } from './auth.types'

export type AuthContextValue = {
  usuario: Usuario | null
  carregando: boolean
  login: (identidade: string, senha: string) => Promise<void>
  alterarSenha: (
    senhaAtual: string,
    novaSenha: string,
    confirmacaoSenha: string,
  ) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext =
  createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth deve ser utilizado dentro de AuthProvider.',
    )
  }

  return context
}