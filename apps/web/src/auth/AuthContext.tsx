import axios from 'axios'
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  http,
  refreshSession,
  setAccessToken,
} from '../api/http'
import { AuthContext } from './auth.context'
import type {
  AuthResponse,
  Usuario,
} from './auth.types'

let initialSessionPromise: Promise<AuthResponse> | null = null

function getInitialSession() {
  if (!initialSessionPromise) {
    initialSessionPromise = refreshSession()
  }

  return initialSessionPromise
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    getInitialSession()
      .then((sessao) => {
        if (ativo) {
          setUsuario(sessao.usuario)
        }
      })
      .catch(() => {
        if (ativo) {
          setAccessToken(null)
          setUsuario(null)
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false)
        }
      })

    return () => {
      ativo = false
    }
  }, [])

  async function login(identidade: string, senha: string) {
    try {
      const response = await http.post<AuthResponse>(
        '/auth/login',
        {
          login: identidade,
          senha,
        },
      )

      setAccessToken(response.data.accessToken)
      setUsuario(response.data.usuario)
    } catch (error) {
      if (axios.isAxiosError<{ erro?: string }>(error)) {
        throw new Error(
          error.response?.data.erro ??
            'Não foi possível conectar ao servidor.',
          {
            cause: error,
          },
        )
      }

      throw new Error(
        'Não foi possível realizar o login.',
        {
          cause: error,
        },
      )
    }
  }

  async function logout() {
    try {
      await http.post('/auth/logout')
    } finally {
      setAccessToken(null)
      setUsuario(null)
    }
  }

  async function alterarSenha(
    senhaAtual: string,
    novaSenha: string,
    confirmacaoSenha: string,
  ) {
    try {
      await http.patch('/auth/password', {
        senhaAtual,
        novaSenha,
        confirmacaoSenha,
      })

      setUsuario((usuarioAtual) =>
        usuarioAtual
          ? {
              ...usuarioAtual,
              primeiroAcesso: false,
            }
          : null,
      )
    } catch (error) {
      if (axios.isAxiosError<{ erro?: string }>(error)) {
        throw new Error(
          error.response?.data.erro ??
            'Não foi possível alterar a senha.',
          {
            cause: error,
          },
        )
      }

      throw new Error('Não foi possível alterar a senha.', {
        cause: error,
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        carregando,
        login,
        alterarSenha,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}