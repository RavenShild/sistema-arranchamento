import axios from 'axios'
import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'

type Subunidade = {
  id: number
  sigla: string
  nome: string
  ativa: boolean
  _count: {
    militares: number
  }
}

type ListarSubunidadesResponse = {
  subunidades: Subunidade[]
}

function obterMensagemErro(error: unknown) {
  if (axios.isAxiosError<{ erro?: string }>(error)) {
    return (
      error.response?.data.erro ??
      'Não foi possível concluir a operação.'
    )
  }

  return 'Não foi possível concluir a operação.'
}

async function buscarSubunidades(signal?: AbortSignal) {
  const response =
    await http.get<ListarSubunidadesResponse>(
      '/subunidades',
      { signal },
    )

  return response.data.subunidades
}

export function SubunidadesPage() {
  const [subunidades, setSubunidades] = useState<Subunidade[]>([])
  const [sigla, setSigla] = useState('')
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function carregarSubunidades() {
    try {
      const resultado = await buscarSubunidades()

      setSubunidades(resultado)
      setErro('')
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    let componenteAtivo = true

    buscarSubunidades(controller.signal)
      .then((resultado) => {
        if (componenteAtivo) {
          setSubunidades(resultado)
          setErro('')
        }
      })
      .catch((error: unknown) => {
        if (componenteAtivo && !axios.isCancel(error)) {
          setErro(obterMensagemErro(error))
        }
      })
      .finally(() => {
        if (componenteAtivo) {
          setCarregando(false)
        }
      })

    return () => {
      componenteAtivo = false
      controller.abort()
    }
  }, [])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setErro('')
    setMensagem('')
    setSalvando(true)

    try {
      await http.post('/subunidades', {
        sigla,
        nome,
      })

      setSigla('')
      setNome('')
      setMensagem('Subunidade cadastrada com sucesso.')

      await carregarSubunidades()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  async function alterarSituacao(
    subunidade: Subunidade,
  ) {
    setErro('')
    setMensagem('')

    try {
      await http.patch(
        `/subunidades/${subunidade.id}`,
        {
          ativa: !subunidade.ativa,
        },
      )

      setMensagem(
        subunidade.ativa
          ? 'Subunidade desativada.'
          : 'Subunidade ativada.',
      )

      await carregarSubunidades()
    } catch (error) {
      setErro(obterMensagemErro(error))
    }
  }

  function atualizarSubunidades() {
    setErro('')
    setMensagem('')
    setCarregando(true)

    void carregarSubunidades()
  }

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

      <div className="management-grid">
        <section className="user-card">
          <h2>Nova subunidade</h2>

          <p className="section-description">
            Cadastre uma subunidade interna da OM.
          </p>

          <form
            className="management-form"
            onSubmit={handleSubmit}
          >
            <label>
              Sigla

              <input
                value={sigla}
                onChange={(event) =>
                  setSigla(event.target.value)
                }
                placeholder="Ex.: 1º Esqd"
                maxLength={20}
                required
              />
            </label>

            <label>
              Nome

              <input
                value={nome}
                onChange={(event) =>
                  setNome(event.target.value)
                }
                placeholder="Ex.: 1º Esquadrão"
                maxLength={120}
                required
              />
            </label>

            <button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Cadastrar'}
            </button>
          </form>

          {erro && (
            <div className="error-message" role="alert">
              {erro}
            </div>
          )}

          {mensagem && (
            <div
              className="success-message"
              role="status"
            >
              {mensagem}
            </div>
          )}
        </section>

        <section className="user-card list-card">
          <div className="section-heading">
            <div>
              <h2>Subunidades cadastradas</h2>

              <p className="section-description">
                {subunidades.length} registro(s)
              </p>
            </div>

            <button
              type="button"
              className="secondary"
              onClick={atualizarSubunidades}
              disabled={carregando}
            >
              {carregando ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          {carregando ? (
            <p>Carregando subunidades...</p>
          ) : subunidades.length === 0 ? (
            <div className="empty-state">
              Nenhuma subunidade cadastrada.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Sigla</th>
                    <th>Nome</th>
                    <th>Militares</th>
                    <th>Situação</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>

                <tbody>
                  {subunidades.map((subunidade) => (
                    <tr key={subunidade.id}>
                      <td>
                        <strong>
                          {subunidade.sigla}
                        </strong>
                      </td>

                      <td>{subunidade.nome}</td>

                      <td>
                        {subunidade._count.militares}
                      </td>

                      <td>
                        <span
                          className={
                            subunidade.ativa
                              ? 'status active'
                              : 'status inactive'
                          }
                        >
                          {subunidade.ativa
                            ? 'Ativa'
                            : 'Inativa'}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() =>
                            void alterarSituacao(
                              subunidade,
                            )
                          }
                        >
                          {subunidade.ativa
                            ? 'Desativar'
                            : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}