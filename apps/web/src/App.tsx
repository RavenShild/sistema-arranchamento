import {
  Navigate,
  Route,
  Routes,
} from 'react-router'
import './App.css'
import { useAuth } from './auth/auth.context'
import { AlterarSenhaPage } from './pages/AlterarSenhaPage'
import { ConfiguracaoOmPage } from './pages/ConfiguracaoOmPage'
import { DashboardPage } from './pages/DashboardPage'
import { EscalaServicoPage } from './pages/EscalaServicoPage'
import { FeriadosPage } from './pages/FeriadoPage'
import { FeriasPage } from './pages/FeriasPage'
import { LoginPage } from './pages/LoginPage'
import { MeuArranchamentoPage } from './pages/MeuArranchamentoPage'
import { MilitaresPage } from './pages/MilitaresPage'
import { PeriodosPage } from './pages/PeriodosPage'
import { RelatoriosPage } from './pages/RelatorioPage'
import { SubunidadesPage } from './pages/SubunidadesPage'
import { UsuariosPage } from './pages/UsuariosPage'
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
            ? (
                <Navigate
                  to={
                    usuario.primeiroAcesso
                      ? '/alterar-senha'
                      : '/'
                  }
                  replace
                />
              )
            : <LoginPage />
        }
      />

      <Route
        element={
          <ProtectedRoute permitirPrimeiroAcesso />
        }
      >
        <Route
          path="/alterar-senha"
          element={<AlterarSenhaPage />}
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />

        <Route
          element={
            <ProtectedRoute permissao="refeicao:ler" />
          }
        >
          <Route
            path="/arranchamento/meu"
            element={<MeuArranchamentoPage />}
          />
        </Route>

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

        <Route
          element={
            <ProtectedRoute permissao="ferias:gerenciar" />
          }
        >
          <Route
            path="/efetivo/ferias"
            element={<FeriasPage />}
          />
        </Route>

        <Route
          element={
            <ProtectedRoute permissao="arranchamento:periodo:gerenciar" />
          }
        >
          <Route
            path="/arranchamento/periodos"
            element={<PeriodosPage />}
          />
        </Route>

        <Route
          element={
            <ProtectedRoute permissao="escala:servico:gerenciar" />
          }
        >
          <Route
            path="/arranchamento/gu-servico"
            element={<EscalaServicoPage />}
          />
        </Route>

        <Route
          element={
            <ProtectedRoute permissao="feriado:gerenciar" />
          }
        >
          <Route
            path="/arranchamento/feriados"
            element={<FeriadosPage />}
          />
        </Route>

        <Route
          path="/arranchamento/relatorios"
          element={<RelatoriosPage />}
        />

        <Route
          element={
            <ProtectedRoute permissao="usuario:gerenciar" />
          }
        >
          <Route
            path="/admin/configuracao-om"
            element={<ConfiguracaoOmPage />}
          />
          <Route
            path="/admin/usuarios"
            element={<UsuariosPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App