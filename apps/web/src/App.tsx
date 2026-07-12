import {
  Navigate,
  Route,
  Routes,
} from 'react-router'
import './App.css'
import { useAuth } from './auth/auth.context'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { MilitaresPage } from './pages/MilitaresPage'
import { SubunidadesPage } from './pages/SubunidadesPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

function App() {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <main className="loading-page">
        <div className="loading-spinner" />
        <p>Carregando sessão...</p>
      </main>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          usuario
            ? <Navigate to="/" replace />
            : <LoginPage />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />

        <Route
          element={
            <ProtectedRoute permissao="militar:gerenciar" />
          }
        >
          <Route
            path="/admin/subunidades"
            element={<SubunidadesPage />}
          />
          <Route
            path="/admin/militares"
            element={<MilitaresPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App