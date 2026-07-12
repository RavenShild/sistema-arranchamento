import { useAuth } from '../auth/auth.context'
import { Link } from 'react-router'

export function DashboardPage() {
  const { usuario, logout } = useAuth()

  if (!usuario) {
    return null
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Sistema de Arranchamento</p>
          <h1>Olá, {usuario.postoGraduacao} {usuario.nomeGuerra}</h1>
        </div>

        <button type="button" className="secondary" onClick={() => void logout()}>
          Sair
        </button>
      </header>

      {usuario.primeiroAcesso && (
        <div className="warning">
          Você precisa alterar sua senha inicial.
        </div>
      )}

      <section className="user-card">
        <h2>Dados do usuário</h2>

        <dl>
          <div>
            <dt>Nome</dt>
            <dd>{usuario.nomeCompleto}</dd>
          </div>

          <div>
            <dt>Posto/graduação</dt>
            <dd>{usuario.postoGraduacao}</dd>
          </div>

          <div>
            <dt>Subunidade</dt>
            <dd>{usuario.subunidade}</dd>
          </div>

          <div>
            <dt>Perfil</dt>
            <dd>{usuario.perfis.join(', ')}</dd>
          </div>
        </dl>
      </section>
          {usuario.permissoes.includes('militar:gerenciar') && (
      <section className="user-card module-card">
        <div>
          <p className="eyebrow">Administração</p>
          <h2>Subunidades</h2>
          <p>
            Cadastre e gerencie as subunidades da OM.
          </p>
        </div>

        <Link
          className="primary-link"
          to="/admin/subunidades"
        >
          Acessar
        </Link>
      </section>
    )}
    </main>

  )
}