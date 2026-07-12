import axios, {
  type InternalAxiosRequestConfig,
} from 'axios'
import type { AuthResponse } from '../auth/auth.types'

type RetryRequest = InternalAxiosRequestConfig & {
  _retry?: boolean
}

let accessToken: string | null = null
let refreshPromise: Promise<AuthResponse> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333',
  timeout: 10000,
  withCredentials: true,
})

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = http
      .post<AuthResponse>('/auth/refresh')
      .then((response) => {
        setAccessToken(response.data.accessToken)
        return response.data
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error)
    }

    const requestOriginal = error.config as RetryRequest
    const url = requestOriginal.url ?? ''

    const rotaDeAutenticacao = [
      '/auth/login',
      '/auth/refresh',
      '/auth/logout',
    ].some((rota) => url.includes(rota))

    if (
      error.response?.status !== 401 ||
      requestOriginal._retry ||
      rotaDeAutenticacao
    ) {
      return Promise.reject(error)
    }

    requestOriginal._retry = true

    try {
      const sessao = await refreshSession()

      requestOriginal.headers.Authorization =
        `Bearer ${sessao.accessToken}`

      return http(requestOriginal)
    } catch {
      setAccessToken(null)
      return Promise.reject(error)
    }
  },
)