import {
  Navigate,
  Outlet,
} from 'react-router'
import { useAuth } from '../auth/auth.context'

type ProtectedRouteProps = {
  permissao?: string
  permitirPrimeiroAcesso?: boolean
}

export function ProtectedRoute({
  permissao,
  permitirPrimeiroAcesso = false,
}: ProtectedRouteProps) {
  const { usuario } = useAuth()

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (usuario.primeiroAcesso && !permitirPrimeiroAcesso) {
    return <Navigate to="/alterar-senha" replace />
  }

  if (
    permissao &&
    !usuario.permissoes.includes(permissao)
  ) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}