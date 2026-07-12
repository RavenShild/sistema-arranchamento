import './App.css'
import { useAuth } from './auth/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'

function App() {
  const { usuario } = useAuth()

  return usuario ? <DashboardPage /> : <LoginPage />
}

export default App