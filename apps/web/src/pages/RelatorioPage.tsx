import axios from 'axios'
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link, Navigate } from 'react-router'
import { http } from '../api/http'
import { useAuth } from '../auth/auth.context'
import '../App.css'

type Escopo = 'GLOBAL' | 'SUBUNIDADE'
type Circulo = 'OFICIAIS' | 'ST_SGT' | 'CB_SD'
type Origem = 'GU_SERVICO' | 'INDIVIDUAL' | 'NENHUMA'
type SituacaoDia = 'NORMAL' | 'FERIAS' | 'LARANJEIRA'

type Periodo = {
  id: number
  dataInicio: string
  dataFim: string
  status: 'FECHADO'
  fechadoEm: string | null
  fechadoPor: {
    militar: {
      nomeGuerra: string
      postoGraduacao: string
    }
  } | null
}

type Subunidade = {
  id: number
  sigla: string
  nome: string
}

type MilitarRelatorio = {
  id: number
  identidadeMilitar: string
  nomeCompleto: string
  nomeGuerra: string
  postoGraduacao: string
  subunidade: Subunidade
  circulo: Circulo
  refeicoes: {
    CAFE: boolean
    ALMOCO: boolean
    JANTA: boolean
    CEIA: boolean
  }
  origem: Origem
  situacaoDia: SituacaoDia
}

type LinhaResumo = {
  circulo: Circulo | 'TOTAL'
  efetivo: number
  CAFE: number
  ALMOCO: number
  JANTA: number
  CEIA: number
}

type RelatorioDiario = {
  periodo: Periodo
  dia: {
    data: string
    fimDeSemana: boolean
    feriado: string | null
  }
  militares: MilitarRelatorio[]
  resumo: LinhaResumo[]
  totalEtapas: number
  escopo: Escopo
}

type PeriodosResponse = {
  periodos: Periodo[]
  escopo: Escopo
}

type SubunidadesResponse = {
  subunidades: Subunidade[]
  escopo: Escopo
}

type ConfiguracaoOm = {
  nome: string
  sigla: string
  postoComandante: string
  nomeComandante: string
}

type ConfiguracaoOmResponse = {
  configuracao: ConfiguracaoOm | null
}

const grupos: Array<{ circulo: Circulo; titulo: string }> = [
  {
    circulo: 'OFICIAIS',
    titulo: 'Oficiais',
  },
  {
    circulo: 'ST_SGT',
    titulo: 'Subtenentes, Sargentos e Al CFST',
  },
  {
    circulo: 'CB_SD',
    titulo: 'Cabos e Soldados',
  },
]

const titulosResumo: Record<LinhaResumo['circulo'], string> = {
  OFICIAIS: 'Oficiais',
  ST_SGT: 'ST/Sgt',
  CB_SD: 'Cb/Sd',
  TOTAL: 'Total',
}

function obterMensagemErro(error: unknown) {
  if (axios.isAxiosError<{ erro?: string }>(error)) {
    return (
      error.response?.data.erro ??
      'Não foi possível gerar o relatório.'
    )
  }

  return 'Não foi possível gerar o relatório.'
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
  }).format(new Date(data))
}

function dataParaInput(data: string) {
  return data.slice(0, 10)
}

function obterEtiquetaSituacao(militar: MilitarRelatorio) {
  if (militar.origem === 'GU_SERVICO') {
    return 'GU de serviço'
  }

  if (militar.situacaoDia === 'LARANJEIRA') {
    return 'Laranjeira'
  }

  if (militar.situacaoDia === 'FERIAS') {
    return 'Férias'
  }

  if (militar.origem === 'INDIVIDUAL') {
    return 'Individual'
  }

  return 'Não arranchado'
}

function obterClasseSituacao(militar: MilitarRelatorio) {
  if (militar.origem === 'GU_SERVICO') {
    return 'report-status-gu'
  }

  if (militar.situacaoDia === 'LARANJEIRA') {
    return 'report-status-laranjeira'
  }

  if (militar.situacaoDia === 'FERIAS') {
    return 'report-status-ferias'
  }

  if (militar.origem === 'INDIVIDUAL') {
    return 'report-status-individual'
  }

  return 'report-status-none'
}

export function RelatoriosPage() {
  const { usuario } = useAuth()
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [subunidades, setSubunidades] = useState<Subunidade[]>([])
  const [escopo, setEscopo] = useState<Escopo>('SUBUNIDADE')
  const [periodoId, setPeriodoId] = useState('')
  const [data, setData] = useState('')
  const [subunidadeId, setSubunidadeId] = useState('')
  const [relatorio, setRelatorio] = useState<RelatorioDiario | null>(
    null,
  )
  const [configuracaoOm, setConfiguracaoOm] =
    useState<ConfiguracaoOm | null>(null)
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  const podeConsultar = Boolean(
    usuario?.permissoes.includes('relatorio:global:ler') ||
      usuario?.permissoes.includes('relatorio:subunidade:ler'),
  )

  useEffect(() => {
    if (!podeConsultar) {
      return
    }

    let ativo = true

    Promise.all([
      http.get<PeriodosResponse>('/relatorios/periodos'),
      http.get<SubunidadesResponse>('/relatorios/subunidades'),
      http.get<ConfiguracaoOmResponse>('/configuracao-om'),
    ])
      .then(
        ([
          periodosResponse,
          subunidadesResponse,
          configuracaoResponse,
        ]) => {
          if (!ativo) {
            return
          }

          const periodosRecebidos = periodosResponse.data.periodos
          const subunidadesRecebidas =
            subunidadesResponse.data.subunidades

          setPeriodos(periodosRecebidos)
          setSubunidades(subunidadesRecebidas)
          setEscopo(periodosResponse.data.escopo)
          setConfiguracaoOm(configuracaoResponse.data.configuracao)

          if (periodosRecebidos[0]) {
            setPeriodoId(String(periodosRecebidos[0].id))
            setData(dataParaInput(periodosRecebidos[0].dataInicio))
          }

          if (
            subunidadesResponse.data.escopo === 'SUBUNIDADE' &&
            subunidadesRecebidas[0]
          ) {
            setSubunidadeId(String(subunidadesRecebidas[0].id))
          }
        },
      )
      .catch((error: unknown) => {
        if (ativo) {
          setErro(obterMensagemErro(error))
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregandoOpcoes(false)
        }
      })

    return () => {
      ativo = false
    }
  }, [podeConsultar])

  const periodoSelecionado = useMemo(
    () =>
      periodos.find(
        (periodo) => periodo.id === Number(periodoId),
      ),
    [periodoId, periodos],
  )

  const subunidadeSelecionada = useMemo(
    () =>
      subunidades.find(
        (subunidade) =>
          subunidade.id === Number(subunidadeId),
      ),
    [subunidadeId, subunidades],
  )

  if (!usuario) {
    return null
  }

  if (!podeConsultar) {
    return <Navigate to="/" replace />
  }

  function handlePeriodoChange(novoPeriodoId: string) {
    const novoPeriodo = periodos.find(
      (periodo) => periodo.id === Number(novoPeriodoId),
    )

    setPeriodoId(novoPeriodoId)
    setData(
      novoPeriodo ? dataParaInput(novoPeriodo.dataInicio) : '',
    )
    setRelatorio(null)
    setErro('')
  }

  async function handleGerarRelatorio(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!periodoId || !data) {
      setErro('Selecione o período e a data do relatório.')
      return
    }

    setErro('')
    setGerando(true)

    try {
      const response = await http.get<RelatorioDiario>(
        `/relatorios/periodos/${periodoId}/dias/${data}`,
        {
          params: {
            subunidadeId:
              escopo === 'GLOBAL' && subunidadeId
                ? Number(subunidadeId)
                : undefined,
          },
        },
      )

      setRelatorio(response.data)
    } catch (error) {
      setRelatorio(null)
      setErro(obterMensagemErro(error))
    } finally {
      setGerando(false)
    }
  }

  const nomeOm = configuracaoOm?.nome || 'ORGANIZAÇÃO MILITAR'
  const comandanteOm = configuracaoOm
    ? `${configuracaoOm.postoComandante} ${configuracaoOm.nomeComandante}`
    : ''
  const furriel = relatorio?.periodo.fechadoPor?.militar

  return (
    <main className="report-page">
      <header className="dashboard-header no-print">
        <div>
          <p className="eyebrow">Aprovisionamento</p>
          <h1>Relatórios de arranchamento</h1>
        </div>

        <Link className="secondary link-button" to="/">
          Voltar
        </Link>
      </header>

      <section className="report-filters user-card no-print">
        <div className="section-heading">
          <div>
            <h2>Gerar vale diário</h2>
            <p className="section-description">
              Selecione um período fechado e o dia desejado.
            </p>
          </div>

          <span className="report-scope">
            {escopo === 'GLOBAL'
              ? 'Visão de toda a OM'
              : 'Visão da subunidade'}
          </span>
        </div>

        {carregandoOpcoes ? (
          <p>Carregando opções...</p>
        ) : (
          <form
            className="report-filter-grid"
            onSubmit={handleGerarRelatorio}
          >
            <label>
              Período semanal
              <select
                value={periodoId}
                onChange={(event) =>
                  handlePeriodoChange(event.target.value)
                }
                required
              >
                <option value="">Selecione</option>
                {periodos.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    {formatarData(periodo.dataInicio)} a{' '}
                    {formatarData(periodo.dataFim)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Dia do vale
              <input
                type="date"
                value={data}
                min={
                  periodoSelecionado
                    ? dataParaInput(periodoSelecionado.dataInicio)
                    : undefined
                }
                max={
                  periodoSelecionado
                    ? dataParaInput(periodoSelecionado.dataFim)
                    : undefined
                }
                onChange={(event) => {
                  setData(event.target.value)
                  setRelatorio(null)
                }}
                required
              />
            </label>

            {escopo === 'GLOBAL' && (
              <label>
                Subunidade
                <select
                  value={subunidadeId}
                  onChange={(event) => {
                    setSubunidadeId(event.target.value)
                    setRelatorio(null)
                  }}
                >
                  <option value="">Toda a OM</option>
                  {subunidades.map((subunidade) => (
                    <option
                      key={subunidade.id}
                      value={subunidade.id}
                    >
                      {subunidade.sigla} - {subunidade.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button type="submit" disabled={gerando}>
              {gerando ? 'Gerando...' : 'Gerar relatório'}
            </button>
          </form>
        )}

        {erro && (
          <div className="error-message" role="alert">
            {erro}
          </div>
        )}
      </section>

      {relatorio && (
        <>
          <div className="report-actions no-print">
            <p>
              Relatório pronto para visualização e impressão em A4.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
            >
              Imprimir ou salvar em PDF
            </button>
          </div>

          <article className="report-paper">
            <header className="report-document-header">
              <div className="report-organization">
                <span>Sistema de Arranchamento</span>
                <strong>{nomeOm}</strong>
                <span>
                  {subunidadeSelecionada
                    ? `${subunidadeSelecionada.sigla} - ${subunidadeSelecionada.nome}`
                    : configuracaoOm?.sigla
                      ? `${configuracaoOm.sigla} — Consolidado da Organização Militar`
                      : 'Consolidado da Organização Militar'}
                </span>
              </div>

              <div className="report-title-block">
                <p>VALE DIÁRIO</p>
                <h2>
                  {formatarData(relatorio.dia.data)}
                </h2>
                <span>Relação nominal de refeições</span>
              </div>
            </header>

            {(relatorio.dia.fimDeSemana ||
              relatorio.dia.feriado) && (
              <div className="report-day-alert">
                {relatorio.dia.fimDeSemana && (
                  <span>Fim de semana</span>
                )}
                {relatorio.dia.feriado && (
                  <span>Feriado: {relatorio.dia.feriado}</span>
                )}
              </div>
            )}

            <section className="report-meal-cards">
              {(['CAFE', 'ALMOCO', 'JANTA', 'CEIA'] as const).map(
                (refeicao) => {
                  const total = relatorio.resumo.find(
                    (linha) => linha.circulo === 'TOTAL',
                  )

                  const titulos = {
                    CAFE: 'Café',
                    ALMOCO: 'Almoço',
                    JANTA: 'Janta',
                    CEIA: 'Ceia',
                  }

                  return (
                    <div className="report-meal-card" key={refeicao}>
                      <span>{titulos[refeicao]}</span>
                      <strong>{total?.[refeicao] ?? 0}</strong>
                      {refeicao === 'CEIA' && (
                        <small>Exclusiva da GU</small>
                      )}
                    </div>
                  )
                },
              )}
            </section>

            <section className="report-summary-section">
              <div className="report-section-title">
                <div>
                  <span>Resumo</span>
                  <h3>Etapas por círculo hierárquico</h3>
                </div>
                <strong>
                  {relatorio.totalEtapas} etapas no dia
                </strong>
              </div>

              <div className="report-table-wrapper">
                <table className="report-summary-table">
                  <thead>
                    <tr>
                      <th>Círculo</th>
                      <th>Efetivo</th>
                      <th>Café</th>
                      <th>Almoço</th>
                      <th>Janta</th>
                      <th>Ceia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.resumo.map((linha) => (
                      <tr
                        key={linha.circulo}
                        className={
                          linha.circulo === 'TOTAL'
                            ? 'report-total-row'
                            : undefined
                        }
                      >
                        <th>{titulosResumo[linha.circulo]}</th>
                        <td>{linha.efetivo}</td>
                        <td>{linha.CAFE}</td>
                        <td>{linha.ALMOCO}</td>
                        <td>{linha.JANTA}</td>
                        <td>{linha.CEIA}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-roster-section">
              <div className="report-section-title">
                <div>
                  <span>Relação nominal</span>
                  <h3>Militares da OM</h3>
                </div>
                <strong>
                  {relatorio.militares.length} militares
                </strong>
              </div>

              <div className="report-table-wrapper">
                <table className="report-roster-table">
                  <thead>
                    <tr>
                      <th className="report-pg-column">P/G</th>
                      <th>Nome de guerra</th>
                      <th>SU</th>
                      <th className="report-meal-column">C</th>
                      <th className="report-meal-column">A</th>
                      <th className="report-meal-column">J</th>
                      <th className="report-meal-column">CE</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((grupo) => {
                      const registros = relatorio.militares.filter(
                        (militar) => militar.circulo === grupo.circulo,
                      )

                      if (registros.length === 0) {
                        return null
                      }

                      return (
                        <Fragment key={grupo.circulo}>
                          <tr className="report-group-row">
                            <th colSpan={8}>{grupo.titulo}</th>
                          </tr>
                          {registros.map((militar) => (
                            <tr key={militar.id}>
                              <td>{militar.postoGraduacao}</td>
                              <td>
                                <strong>{militar.nomeGuerra}</strong>
                              </td>
                              <td>{militar.subunidade.sigla}</td>
                              <td className="report-mark">
                                {militar.refeicoes.CAFE ? 'X' : ''}
                              </td>
                              <td className="report-mark">
                                {militar.refeicoes.ALMOCO ? 'X' : ''}
                              </td>
                              <td className="report-mark">
                                {militar.refeicoes.JANTA ? 'X' : ''}
                              </td>
                              <td className="report-mark">
                                {militar.refeicoes.CEIA ? 'X' : ''}
                              </td>
                              <td>
                                <span
                                  className={`report-status ${obterClasseSituacao(militar)}`}
                                >
                                  {obterEtiquetaSituacao(militar)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-legend">
              <strong>Legenda</strong>
              <span className="report-status report-status-individual">
                Individual
              </span>
              <span className="report-status report-status-gu">
                GU de serviço
              </span>
              <span className="report-status report-status-laranjeira">
                Laranjeira
              </span>
              <span className="report-status report-status-ferias">
                Férias
              </span>
            </section>

            <footer className="report-document-footer">
              <div className="report-signature">
                <strong>{comandanteOm || '\u00A0'}</strong>
                <span>Comandante da OM</span>
              </div>

              <div className="report-signature">
                <strong>
                  {furriel
                    ? `${furriel.postoGraduacao} ${furriel.nomeGuerra}`
                    : '\u00A0'}
                </strong>
                <span>Furriel</span>
              </div>
            </footer>

            <div className="report-generation-info">
              Período de {formatarData(relatorio.periodo.dataInicio)} a{' '}
              {formatarData(relatorio.periodo.dataFim)}. Gerado em{' '}
              {new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date())}.
            </div>
          </article>
        </>
      )}
    </main>
  )
}