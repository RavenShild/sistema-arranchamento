import axios from 'axios'
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'

type Subunidade = {
  id: number
  sigla: string
  nome: string
}

type Militar = {
  id: number
  identidadeMilitar: string
  nomeGuerra: string
  nomeCompleto: string
  postoGraduacao: string
  subunidade: Subunidade
}

type Periodo = {
  id: number
  dataInicio: string
  dataFim: string
  status: 'ABERTO'
}

type Escala = {
  id: number
  periodoId: number
  militarId: number
  data: string
  militar: Militar
  cadastradoPor: {
    id: number
    militar: {
      nomeGuerra: string
      postoGraduacao: string
    }
  }
}

type ContextoEscalaResponse = {
  periodo: Periodo | null
  militares: Militar[]
  escalas: Escala[]
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

function formatarDiaSemana(data: string) {
  const texto = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(data))

  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function gerarDatasPeriodo(periodo: Periodo | null) {
  if (!periodo) {
    return []
  }

  const datas: string[] = []
  const atual = new Date(
    `${somenteData(periodo.dataInicio)}T00:00:00.000Z`,
  )
  const fim = new Date(
    `${somenteData(periodo.dataFim)}T00:00:00.000Z`,
  )

  while (atual <= fim) {
    datas.push(atual.toISOString().slice(0, 10))
    atual.setUTCDate(atual.getUTCDate() + 1)
  }

  return datas
}

async function buscarContexto(signal?: AbortSignal) {
  const response = await http.get<ContextoEscalaResponse>(
    '/escalas/contexto',
    { signal },
  )

  return response.data
}

export function EscalaServicoPage() {
  const [periodo, setPeriodo] = useState<Periodo | null>(null)
  const [militares, setMilitares] = useState<Militar[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [militarId, setMilitarId] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindoId, setExcluindoId] =
    useState<number | null>(null)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const datasPeriodo = useMemo(
    () => gerarDatasPeriodo(periodo),
    [periodo],
  )

  const escalasPorData = useMemo(() => {
    return datasPeriodo.map((data) => ({
      data,
      escalas: escalas.filter(
        (escala) => somenteData(escala.data) === data,
      ),
    }))
  }, [datasPeriodo, escalas])

  useEffect(() => {
    const controller = new AbortController()
    let componenteAtivo = true

    buscarContexto(controller.signal)
      .then((contexto) => {
        if (componenteAtivo) {
          setPeriodo(contexto.periodo)
          setMilitares(contexto.militares)
          setEscalas(contexto.escalas)
          setDataSelecionada(
            contexto.periodo
              ? somenteData(contexto.periodo.dataInicio)
              : '',
          )
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

  async function recarregarContexto() {
    const contexto = await buscarContexto()
    setPeriodo(contexto.periodo)
    setMilitares(contexto.militares)
    setEscalas(contexto.escalas)

    if (!dataSelecionada && contexto.periodo) {
      setDataSelecionada(somenteData(contexto.periodo.dataInicio))
    }
  }

  async function adicionarMilitar(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setSalvando(true)

    try {
      await http.post('/escalas', {
        militarId: Number(militarId),
        data: dataSelecionada,
      })

      setMilitarId('')
      setMensagem('Militar incluído na GU de serviço.')
      await recarregarContexto()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  async function removerMilitar(escala: Escala) {
    const confirmado = window.confirm(
      `Remover ${escala.militar.postoGraduacao} ${escala.militar.nomeGuerra} da GU de ${formatarData(escala.data)}?`,
    )

    if (!confirmado) {
      return
    }

    setErro('')
    setMensagem('')
    setExcluindoId(escala.id)

    try {
      await http.delete(`/escalas/${escala.id}`)
      setMensagem('Militar removido da GU de serviço.')
      await recarregarContexto()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <main className="dashboard duty-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Arranchamento</p>
          <h1>Guarnição de serviço</h1>
        </div>

        <Link className="secondary link-button" to="/">
          Voltar
        </Link>
      </header>

      {erro && (
        <div className="error-message page-message" role="alert">
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="success-message page-message" role="status">
          {mensagem}
        </div>
      )}

      {carregando ? (
        <section className="user-card">
          <p>Carregando escala de serviço...</p>
        </section>
      ) : !periodo ? (
        <section className="user-card empty-period-card">
          <p className="eyebrow">GU de serviço</p>
          <h2>Nenhum período aberto</h2>
          <p className="section-description">
            Abra um período semanal antes de cadastrar a escala.
          </p>
          <Link
            className="primary-link"
            to="/arranchamento/periodos"
          >
            Gerenciar períodos
          </Link>
        </section>
      ) : (
        <>
          <section className="user-card duty-form-card">
            <div>
              <p className="eyebrow">Período aberto</p>
              <h2>
                {formatarData(periodo.dataInicio)} a{' '}
                {formatarData(periodo.dataFim)}
              </h2>
              <p className="section-description">
                A GU recebe automaticamente Café, Almoço, Janta e
                Ceia.
              </p>
            </div>

            <form
              className="duty-form"
              onSubmit={adicionarMilitar}
            >
              <label>
                Data do serviço
                <select
                  value={dataSelecionada}
                  onChange={(event) =>
                    setDataSelecionada(event.target.value)
                  }
                  required
                >
                  {datasPeriodo.map((data) => (
                    <option key={data} value={data}>
                      {formatarDiaSemana(data)} —{' '}
                      {formatarData(data)}
                    </option>
                  ))}
                </select>
              </label>

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

              <button type="submit" disabled={salvando}>
                {salvando ? 'Incluindo...' : 'Incluir na GU'}
              </button>
            </form>
          </section>

          <section className="duty-days-grid">
            {escalasPorData.map((grupo) => (
              <article className="user-card duty-day-card" key={grupo.data}>
                <header>
                  <div>
                    <p className="eyebrow">
                      {formatarDiaSemana(grupo.data)}
                    </p>
                    <h2>{formatarData(grupo.data)}</h2>
                  </div>
                  <span className="duty-count">
                    {grupo.escalas.length} militar(es)
                  </span>
                </header>

                {grupo.escalas.length === 0 ? (
                  <div className="empty-duty-day">
                    Nenhum militar escalado.
                  </div>
                ) : (
                  <div className="duty-list">
                    {grupo.escalas.map((escala) => (
                      <div className="duty-member" key={escala.id}>
                        <div>
                          <strong>
                            {escala.militar.postoGraduacao}{' '}
                            {escala.militar.nomeGuerra}
                          </strong>
                          <span>
                            {escala.militar.subunidade.sigla}
                          </span>
                        </div>

                        <div className="meal-badges">
                          <span>Café</span>
                          <span>Almoço</span>
                          <span>Janta</span>
                          <span>Ceia</span>
                        </div>

                        <button
                          type="button"
                          className="table-action danger"
                          onClick={() =>
                            void removerMilitar(escala)
                          }
                          disabled={excluindoId === escala.id}
                        >
                          {excluindoId === escala.id
                            ? 'Removendo...'
                            : 'Remover'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  )
}