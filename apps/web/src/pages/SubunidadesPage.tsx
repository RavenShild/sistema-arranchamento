import { Link } from 'react-router'

export function SubunidadesPage() {
  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Subunidades</h1>
        </div>

        <Link className="secondary link-button" to="/">
          Voltar
        </Link>
      </header>

      <section className="user-card">
        <h2>Gerenciamento de subunidades</h2>
        <p>
          A listagem e o formulário serão adicionados na próxima etapa.
        </p>
      </section>
    </main>
  )
}