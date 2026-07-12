import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { login } = useAuth()

  const [identidade, setIdentidade] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErro('')
    setEnviando(true)

    try {
      await login(identidade, senha)
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível realizar o login.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-heading">
          <span className="system-badge">OM</span>

          <div>
            <p className="eyebrow">Acesso restrito</p>
            <h1>Sistema de Arranchamento</h1>
            <p className="description">
              Entre com sua identidade militar ou e-mail.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Identidade ou e-mail
            <input
              value={identidade}
              onChange={(event) => setIdentidade(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {erro && (
            <div className="error-message" role="alert">
              {erro}
            </div>
          )}

          <button type="submit" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}