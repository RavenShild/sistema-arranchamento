import axios from 'axios'
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'

type Responsavel = {
  id: number
  militar: {
    nomeGuerra: string
    postoGraduacao: string
  }
}

type Periodo = {
  id: number
  dataInicio: string
  dataFim: string
  status: 'ABERTO' | 'FECHADO'
  abertoEm: string
  fechadoEm: string | null
  abertoPor: Responsavel
  fechadoPor: Responsavel | null
  _count: {
    arranchamentos: number
    escalasServico: number
  }
}

type PeriodosResponse = {
  periodos: Periodo[]
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

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(data))
}

function converterDataLocal(data: string) {
  return new Date(`${data}T00:00:00`)
}

function ehQuintaFeira(data: string) {
  return converterDataLocal(data).getDay() === 4
}

function calcularDataFim(dataInicio: string) {
  if (!dataInicio) {
    return ''
  }

  const data = converterDataLocal(dataInicio)
  data.setDate(data.getDate() + 6)

  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function calcularProximoInicio(dataFim: string) {
  const data = converterDataLocal(somenteData(dataFim))
  data.setDate(data.getDate() + 1)

  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function obterProximaQuintaFeira() {
  const data = new Date()
  const diaSemana = data.getDay()
  let diasAteQuinta = (4 - diaSemana + 7) % 7

  if (diasAteQuinta === 0) {
    diasAteQuinta = 7
  }

  data.setDate(data.getDate() + diasAteQuinta)

  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

async function buscarPeriodos(signal?: AbortSignal) {
  const response = await http.get<PeriodosResponse>(
    '/periodos',
    { signal },
  )

  return response.data.periodos
}

export function PeriodosPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [dataInicio, setDataInicio] = useState(
    obterProximaQuintaFeira,
  )
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [fechandoId, setFechandoId] =
    useState<number | null>(null)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const periodoAberto = useMemo(
    () =>
      periodos.find((periodo) => periodo.status === 'ABERTO') ??
      null,
    [periodos],
  )

  const dataFimCalculada = calcularDataFim(dataInicio)

  useEffect(() => {
    const controller = new AbortController()
    let componenteAtivo = true

    buscarPeriodos(controller.signal)
      .then((periodosEncontrados) => {
        if (componenteAtivo) {
          setPeriodos(periodosEncontrados)
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

  async function recarregarPeriodos() {
    const resultado = await buscarPeriodos()
    setPeriodos(resultado)
  }

  async function abrirPeriodo(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setErro('')
    setMensagem('')

    if (!ehQuintaFeira(dataInicio)) {
      setErro('A data inicial precisa ser uma quinta-feira.')
      return
    }

    setSalvando(true)

    try {
      await http.post('/periodos', {
        dataInicio,
      })

      setMensagem('Período de arranchamento aberto.')
      await recarregarPeriodos()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  async function fecharPeriodo(periodo: Periodo) {
    const confirmado = window.confirm(
      `Fechar definitivamente o período de ${formatarData(periodo.dataInicio)} a ${formatarData(periodo.dataFim)}?`,
    )

    if (!confirmado) {
      return
    }

    setErro('')
    setMensagem('')
    setFechandoId(periodo.id)

    try {
      await http.patch(`/periodos/${periodo.id}/fechar`)
      setMensagem('Período fechado e bloqueado para alterações.')
      await recarregarPeriodos()
      setDataInicio(calcularProximoInicio(periodo.dataFim))
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setFechandoId(null)
    }
  }

  return (
    <main className="dashboard period-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Arranchamento</p>
          <h1>Períodos semanais</h1>
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

      <div className="period-layout">
        <section className="user-card current-period-card">
          <p className="eyebrow">Ciclo atual</p>

          {carregando ? (
            <p>Carregando período...</p>
          ) : periodoAberto ? (
            <>
              <div className="period-title-row">
                <div>
                  <h2>Período aberto</h2>
                  <p className="period-range">
                    {formatarData(periodoAberto.dataInicio)} a{' '}
                    {formatarData(periodoAberto.dataFim)}
                  </p>
                </div>

                <span className="status active">Aberto</span>
              </div>

              <dl className="period-details">
                <div>
                  <dt>Aberto por</dt>
                  <dd>
                    {periodoAberto.abertoPor.militar.postoGraduacao}{' '}
                    {periodoAberto.abertoPor.militar.nomeGuerra}
                  </dd>
                </div>
                <div>
                  <dt>Data da abertura</dt>
                  <dd>{formatarDataHora(periodoAberto.abertoEm)}</dd>
                </div>
                <div>
                  <dt>Arranchamentos</dt>
                  <dd>{periodoAberto._count.arranchamentos}</dd>
                </div>
                <div>
                  <dt>Militares de serviço</dt>
                  <dd>{periodoAberto._count.escalasServico}</dd>
                </div>
              </dl>

              <div className="period-warning">
                O fechamento é definitivo e bloqueará novas
                alterações neste ciclo.
              </div>

              <button
                type="button"
                className="danger-button"
                onClick={() => void fecharPeriodo(periodoAberto)}
                disabled={fechandoId === periodoAberto.id}
              >
                {fechandoId === periodoAberto.id
                  ? 'Fechando...'
                  : 'Fechar período'}
              </button>
            </>
          ) : (
            <>
              <h2>Nenhum período aberto</h2>
              <p className="section-description">
                Selecione uma quinta-feira para iniciar o próximo
                ciclo. A quarta-feira será calculada automaticamente.
              </p>

              <form
                className="management-form period-form"
                onSubmit={abrirPeriodo}
              >
                <label>
                  Quinta-feira inicial
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(event) =>
                      setDataInicio(event.target.value)
                    }
                    required
                  />
                </label>

                <div className="calculated-date">
                  <span>Término calculado</span>
                  <strong>
                    {dataFimCalculada
                      ? formatarData(dataFimCalculada)
                      : 'Selecione a data inicial'}
                  </strong>
                </div>

                <button type="submit" disabled={salvando}>
                  {salvando ? 'Abrindo...' : 'Abrir período'}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="user-card list-card">
          <div className="section-heading">
            <div>
              <h2>Histórico de períodos</h2>
              <p className="section-description">
                {periodos.length} registro(s)
              </p>
            </div>
          </div>

          {carregando ? (
            <p>Carregando histórico...</p>
          ) : periodos.length === 0 ? (
            <div className="empty-state">
              Nenhum período cadastrado.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Situação</th>
                    <th>Arranchamentos</th>
                    <th>GU de serviço</th>
                    <th>Responsável</th>
                  </tr>
                </thead>

                <tbody>
                  {periodos.map((periodo) => (
                    <tr key={periodo.id}>
                      <td>
                        <strong>
                          {formatarData(periodo.dataInicio)} a{' '}
                          {formatarData(periodo.dataFim)}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={
                            periodo.status === 'ABERTO'
                              ? 'status active'
                              : 'status inactive'
                          }
                        >
                          {periodo.status === 'ABERTO'
                            ? 'Aberto'
                            : 'Fechado'}
                        </span>
                      </td>
                      <td>{periodo._count.arranchamentos}</td>
                      <td>{periodo._count.escalasServico}</td>
                      <td>
                        {periodo.status === 'FECHADO' &&
                        periodo.fechadoPor
                          ? `${periodo.fechadoPor.militar.postoGraduacao} ${periodo.fechadoPor.militar.nomeGuerra}`
                          : `${periodo.abertoPor.militar.postoGraduacao} ${periodo.abertoPor.militar.nomeGuerra}`}
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