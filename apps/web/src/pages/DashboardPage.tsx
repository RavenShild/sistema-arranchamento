import { Link } from 'react-router'
import { useAuth } from '../auth/auth.context'

export function DashboardPage() {
  const { usuario, logout } = useAuth()

  if (!usuario) {
    return null
  }

  const podeGerenciarMilitares =
    usuario.permissoes.includes('militar:gerenciar')
  const podeGerenciarFerias =
    usuario.permissoes.includes('ferias:gerenciar')
  const podeGerenciarPeriodos = usuario.permissoes.includes(
    'arranchamento:periodo:gerenciar',
  )
  const podeGerenciarEscala = usuario.permissoes.includes(
    'escala:servico:gerenciar',
  )
  const podeRealizarArranchamento =
    usuario.permissoes.includes('refeicao:ler')
  const podeConsultarRelatorios =
    usuario.permissoes.includes('relatorio:global:ler') ||
    usuario.permissoes.includes('relatorio:subunidade:ler')

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Sistema de Arranchamento</p>
          <h1>
            Olá, {usuario.postoGraduacao}{' '}
            {usuario.nomeGuerra}
          </h1>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={() => void logout()}
        >
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

      {(podeRealizarArranchamento ||
        podeGerenciarMilitares ||
        podeGerenciarFerias ||
        podeGerenciarPeriodos ||
        podeGerenciarEscala ||
        podeConsultarRelatorios) && (
        <div className="module-grid">
          {podeRealizarArranchamento && (
            <section className="user-card module-card">
              <div>
                <p className="eyebrow">Arranchamento</p>
                <h2>Meu arranchamento</h2>
                <p>
                  Selecione Café, Almoço e Janta para o período
                  aberto.
                </p>
              </div>

              <Link
                className="primary-link"
                to="/arranchamento/meu"
              >
                Acessar
              </Link>
            </section>
          )}

          {podeGerenciarMilitares && (
            <>
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

              <section className="user-card module-card">
                <div>
                  <p className="eyebrow">Administração</p>
                  <h2>Militares</h2>
                  <p>
                    Cadastre e mantenha os dados dos militares.
                  </p>
                </div>

                <Link
                  className="primary-link"
                  to="/admin/militares"
                >
                  Acessar
                </Link>
              </section>
            </>
          )}

          {podeGerenciarFerias && (
            <section className="user-card module-card">
              <div>
                <p className="eyebrow">Controle de efetivo</p>
                <h2>Férias</h2>
                <p>
                  Gerencie períodos de férias e militares
                  laranjeiras.
                </p>
              </div>

              <Link
                className="primary-link"
                to="/efetivo/ferias"
              >
                Acessar
              </Link>
            </section>
          )}

          {podeGerenciarPeriodos && (
            <section className="user-card module-card">
              <div>
                <p className="eyebrow">Arranchamento</p>
                <h2>Períodos semanais</h2>
                <p>
                  Abra e feche os ciclos de quinta a quarta-feira.
                </p>
              </div>

              <Link
                className="primary-link"
                to="/arranchamento/periodos"
              >
                Acessar
              </Link>
            </section>
          )}

          {podeGerenciarEscala && (
            <section className="user-card module-card">
              <div>
                <p className="eyebrow">Arranchamento</p>
                <h2>GU de serviço</h2>
                <p>
                  Cadastre a guarnição e as quatro refeições do
                  serviço.
                </p>
              </div>

              <Link
                className="primary-link"
                to="/arranchamento/gu-servico"
              >
                Acessar
              </Link>
            </section>
          )}

          {podeConsultarRelatorios && (
            <section className="user-card module-card">
              <div>
                <p className="eyebrow">Aprovisionamento</p>
                <h2>Relatórios</h2>
                <p>
                  Consulte o vale diário, os totais por refeição e
                  a relação nominal dos militares.
                </p>
              </div>

              <Link
                className="primary-link"
                to="/arranchamento/relatorios"
              >
                Acessar
              </Link>
            </section>
          )}
        </div>
      )}
    </main>
  )
}