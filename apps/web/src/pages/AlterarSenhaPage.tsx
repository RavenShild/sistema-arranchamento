import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/auth.context'
import '../App.css'

export function AlterarSenhaPage() {
  const { usuario, alterarSenha } = useAuth()
  const navigate = useNavigate()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('')
  const [mostrarSenhas, setMostrarSenhas] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (novaSenha !== confirmacaoSenha) {
      setErro('A confirmação não corresponde à nova senha.')
      return
    }

    setErro('')
    setEnviando(true)

    try {
      await alterarSenha(
        senhaAtual,
        novaSenha,
        confirmacaoSenha,
      )
      navigate('/', {
        replace: true,
      })
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar a senha.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="password-page">
      <section className="password-panel">
        <header className="password-heading">
          <span className="system-badge">OM</span>
          <div>
            <p className="eyebrow">Segurança da conta</p>
            <h1>Alterar senha</h1>
            <p>
              {usuario?.primeiroAcesso
                ? 'Antes de continuar, substitua sua senha temporária.'
                : 'Defina uma nova senha para acessar o sistema.'}
            </p>
          </div>
        </header>

        {usuario?.primeiroAcesso && (
          <div className="password-required-notice" role="status">
            A troca de senha é obrigatória no primeiro acesso.
          </div>
        )}

        <form className="password-form" onSubmit={handleSubmit}>
          <label>
            Senha atual
            <input
              type={mostrarSenhas ? 'text' : 'password'}
              value={senhaAtual}
              onChange={(event) => setSenhaAtual(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>

          <label>
            Nova senha
            <input
              type={mostrarSenhas ? 'text' : 'password'}
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          <label>
            Confirmar nova senha
            <input
              type={mostrarSenhas ? 'text' : 'password'}
              value={confirmacaoSenha}
              onChange={(event) =>
                setConfirmacaoSenha(event.target.value)
              }
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          <label className="show-password-option">
            <input
              type="checkbox"
              checked={mostrarSenhas}
              onChange={(event) =>
                setMostrarSenhas(event.target.checked)
              }
            />
            Mostrar senhas
          </label>

          <div className="password-requirements">
            <strong>A nova senha deve possuir:</strong>
            <ul>
              <li>Pelo menos 12 caracteres;</li>
              <li>Uma letra maiúscula e uma minúscula;</li>
              <li>Um número;</li>
              <li>Um caractere especial.</li>
            </ul>
          </div>

          {erro && (
            <div className="error-message" role="alert">
              {erro}
            </div>
          )}

          <button type="submit" disabled={enviando}>
            {enviando ? 'Alterando...' : 'Alterar senha'}
          </button>

          {!usuario?.primeiroAcesso && (
            <Link className="password-cancel-link" to="/">
              Cancelar e voltar
            </Link>
          )}
        </form>
      </section>
    </main>
  )
}