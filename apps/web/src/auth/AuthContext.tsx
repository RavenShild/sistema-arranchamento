import axios from 'axios'
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { http, setAccessToken } from '../api/http'

type Usuario = {
  id: number
  nomeCompleto: string
  nomeGuerra: string
  postoGraduacao: string
  subunidade: string
  primeiroAcesso: boolean
  perfis: string[]
  permissoes: string[]
}

type LoginResponse = {
  accessToken: string
  expiresIn: number
  usuario: Usuario
}

type AuthContextValue = {
  usuario: Usuario | null
  login: (identidade: string, senha: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  async function login(identidade: string, senha: string) {
    try {
      const response = await http.post<LoginResponse>('/auth/login', {
        login: identidade,
        senha,
      })

      setAccessToken(response.data.accessToken)
      setUsuario(response.data.usuario)
    } catch (error) {
      if (axios.isAxiosError<{ erro?: string }>(error)) {
        throw new Error(
          error.response?.data.erro ??
            'Não foi possível conectar ao servidor.',
        )
      }

      throw new Error('Não foi possível realizar o login.')
    }
  }

  function logout() {
    setAccessToken(null)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.')
  }

  return context
}