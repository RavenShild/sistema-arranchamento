import axios from 'axios'
import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'

type Militar = {
  id: number
  identidadeMilitar: string
  nomeGuerra: string
  nomeCompleto: string
  postoGraduacao: string
  subunidade: {
    id: number
    sigla: string
    nome: string
  }
}

type Ferias = {
  id: number
  militarId: number
  dataInicio: string
  dataFim: string
  laranjeira: boolean
  militar: Militar
  cadastradoPor: {
    id: number
    militar: {
      nomeGuerra: string
      postoGraduacao: string
    }
  }
}

type MilitaresResponse = {
  militares: Militar[]
}

type FeriasResponse = {
  ferias: Ferias[]
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

function somenteData(data: string) {
  return data.slice(0, 10)
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
  }).format(new Date(data))
}

function obterHoje() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function obterSituacaoFerias(ferias: Ferias) {
  const hoje = obterHoje()
  const inicio = somenteData(ferias.dataInicio)
  const fim = somenteData(ferias.dataFim)

  if (fim < hoje) {
    return {
      classe: 'encerrada',
      rotulo: 'Encerrada',
    }
  }

  if (inicio <= hoje) {
    return {
      classe: 'em-andamento',
      rotulo: 'Em férias',
    }
  }

  return {
    classe: 'programada',
    rotulo: 'Programada',
  }
}

async function buscarMilitares(signal?: AbortSignal) {
  const response = await http.get<MilitaresResponse>(
    '/ferias/militares',
    { signal },
  )

  return response.data.militares
}

async function buscarFerias(
  militarId?: string,
  signal?: AbortSignal,
) {
  const response = await http.get<FeriasResponse>('/ferias', {
    signal,
    params: {
      militarId: militarId || undefined,
    },
  })

  return response.data.ferias
}

export function FeriasPage() {
  const [militares, setMilitares] = useState<Militar[]>([])
  const [ferias, setFerias] = useState<Ferias[]>([])
  const [militarId, setMilitarId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [laranjeira, setLaranjeira] = useState(false)
  const [filtroMilitarId, setFiltroMilitarId] = useState('')
  const [feriasEmEdicao, setFeriasEmEdicao] =
    useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let componenteAtivo = true

    Promise.all([
      buscarMilitares(controller.signal),
      buscarFerias(undefined, controller.signal),
    ])
      .then(([militaresEncontrados, feriasEncontradas]) => {
        if (componenteAtivo) {
          setMilitares(militaresEncontrados)
          setFerias(feriasEncontradas)
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

  function limparFormulario() {
    setMilitarId('')
    setDataInicio('')
    setDataFim('')
    setLaranjeira(false)
    setFeriasEmEdicao(null)
  }

  async function recarregarFerias(filtro = filtroMilitarId) {
    const resultado = await buscarFerias(filtro)
    setFerias(resultado)
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setSalvando(true)

    const dados = {
      militarId: Number(militarId),
      dataInicio,
      dataFim,
      laranjeira,
    }

    try {
      if (feriasEmEdicao) {
        await http.patch(`/ferias/${feriasEmEdicao}`, dados)
        setMensagem('Período de férias atualizado.')
      } else {
        await http.post('/ferias', dados)
        setMensagem('Período de férias cadastrado.')
      }

      limparFormulario()
      await recarregarFerias()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  async function handleFiltro(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setCarregando(true)

    try {
      await recarregarFerias()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setCarregando(false)
    }
  }

  async function limparFiltro() {
    setFiltroMilitarId('')
    setErro('')
    setMensagem('')
    setCarregando(true)

    try {
      await recarregarFerias('')
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setCarregando(false)
    }
  }

  function editarFerias(registro: Ferias) {
    setMilitarId(String(registro.militarId))
    setDataInicio(somenteData(registro.dataInicio))
    setDataFim(somenteData(registro.dataFim))
    setLaranjeira(registro.laranjeira)
    setFeriasEmEdicao(registro.id)
    setErro('')
    setMensagem('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    limparFormulario()
    setErro('')
    setMensagem('')
  }

  async function excluirFerias(registro: Ferias) {
    const confirmado = window.confirm(
      `Excluir as férias de ${registro.militar.postoGraduacao} ${registro.militar.nomeGuerra}?`,
    )

    if (!confirmado) {
      return
    }

    setErro('')
    setMensagem('')

    try {
      await http.delete(`/ferias/${registro.id}`)

      if (feriasEmEdicao === registro.id) {
        limparFormulario()
      }

      setMensagem('Período de férias excluído.')
      await recarregarFerias()
    } catch (error) {
      setErro(obterMensagemErro(error))
    }
  }

  return (
    <main className="dashboard vacation-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Controle de efetivo</p>
          <h1>Férias dos militares</h1>
        </div>

        <Link className="secondary link-button" to="/">
          Voltar
        </Link>
      </header>

      <div className="management-grid vacation-grid">
        <section className="user-card">
          <h2>
            {feriasEmEdicao
              ? 'Editar período'
              : 'Novo período'}
          </h2>

          <p className="section-description">
            Cadastre o período e informe se o militar é
            laranjeira.
          </p>

          <form
            className="management-form"
            onSubmit={handleSubmit}
          >
            <label>
              Militar
              <select
                value={militarId}
                onChange={(event) =>
                  setMilitarId(event.target.value)
                }
                required
              >
                <option value="">Selecione</option>
                {militares.map((militar) => (
                  <option key={militar.id} value={militar.id}>
                    {militar.postoGraduacao}{' '}
                    {militar.nomeGuerra} —{' '}
                    {militar.subunidade.sigla}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Data inicial
              <input
                type="date"
                value={dataInicio}
                onChange={(event) => {
                  setDataInicio(event.target.value)

                  if (
                    dataFim &&
                    event.target.value > dataFim
                  ) {
                    setDataFim(event.target.value)
                  }
                }}
                required
              />
            </label>

            <label>
              Data final
              <input
                type="date"
                value={dataFim}
                min={dataInicio || undefined}
                onChange={(event) =>
                  setDataFim(event.target.value)
                }
                required
              />
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={laranjeira}
                onChange={(event) =>
                  setLaranjeira(event.target.checked)
                }
              />
              <span>
                Militar laranjeira
                <small>
                  Poderá se arranchar durante as férias.
                </small>
              </span>
            </label>

            <div className="form-actions">
              <button type="submit" disabled={salvando}>
                {salvando
                  ? 'Salvando...'
                  : feriasEmEdicao
                    ? 'Salvar alterações'
                    : 'Cadastrar'}
              </button>

              {feriasEmEdicao && (
                <button
                  type="button"
                  className="secondary"
                  onClick={cancelarEdicao}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {erro && (
            <div className="error-message" role="alert">
              {erro}
            </div>
          )}

          {mensagem && (
            <div className="success-message" role="status">
              {mensagem}
            </div>
          )}
        </section>

        <section className="user-card list-card">
          <div className="section-heading">
            <div>
              <h2>Períodos cadastrados</h2>
              <p className="section-description">
                {ferias.length} registro(s)
              </p>
            </div>
          </div>

          <form
            className="vacation-filter"
            onSubmit={handleFiltro}
          >
            <select
              value={filtroMilitarId}
              onChange={(event) =>
                setFiltroMilitarId(event.target.value)
              }
            >
              <option value="">Todos os militares</option>
              {militares.map((militar) => (
                <option key={militar.id} value={militar.id}>
                  {militar.postoGraduacao}{' '}
                  {militar.nomeGuerra}
                </option>
              ))}
            </select>

            <button type="submit" disabled={carregando}>
              Filtrar
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() => void limparFiltro()}
              disabled={carregando}
            >
              Limpar
            </button>
          </form>

          {carregando ? (
            <p>Carregando períodos de férias...</p>
          ) : ferias.length === 0 ? (
            <div className="empty-state">
              Nenhum período de férias encontrado.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Militar</th>
                    <th>Subunidade</th>
                    <th>Período</th>
                    <th>Situação</th>
                    <th>Laranjeira</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>

                <tbody>
                  {ferias.map((registro) => {
                    const situacao =
                      obterSituacaoFerias(registro)
                    const podeExcluir =
                      somenteData(registro.dataInicio) >
                      obterHoje()

                    return (
                      <tr key={registro.id}>
                        <td>
                          <strong>
                            {registro.militar.postoGraduacao}{' '}
                            {registro.militar.nomeGuerra}
                          </strong>
                          <small>
                            {registro.militar.nomeCompleto}
                          </small>
                        </td>
                        <td>
                          {registro.militar.subunidade.sigla}
                        </td>
                        <td>
                          {formatarData(registro.dataInicio)} a{' '}
                          {formatarData(registro.dataFim)}
                        </td>
                        <td>
                          <span
                            className={`status ${situacao.classe}`}
                          >
                            {situacao.rotulo}
                          </span>
                        </td>
                        <td>
                          {registro.laranjeira ? 'Sim' : 'Não'}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="table-action"
                              onClick={() =>
                                editarFerias(registro)
                              }
                            >
                              Editar
                            </button>

                            {podeExcluir && (
                              <button
                                type="button"
                                className="table-action danger"
                                onClick={() =>
                                  void excluirFerias(registro)
                                }
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}