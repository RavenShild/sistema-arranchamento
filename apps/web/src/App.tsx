import './App.css'
import { useAuth } from './auth/auth.context'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'

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

  return usuario ? <DashboardPage /> : <LoginPage />
}

export default App