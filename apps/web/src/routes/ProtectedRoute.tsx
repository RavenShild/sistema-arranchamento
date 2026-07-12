import {
  Navigate,
  Outlet,
} from 'react-router'
import { useAuth } from '../auth/auth.context'

type ProtectedRouteProps = {
  permissao?: string
}

export function ProtectedRoute({
  permissao,
}: ProtectedRouteProps) {
  const { usuario } = useAuth()

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (
    permissao &&
    !usuario.permissoes.includes(permissao)
  ) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}