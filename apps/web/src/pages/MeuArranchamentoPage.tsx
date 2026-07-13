import axios from 'axios'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'

type Refeicao = 'CAFE' | 'ALMOCO' | 'JANTA'

type ContextoArranchamento = {
  sucesso: true
  usuario: {
    id: number
    nomeGuerra: string
    nomeCompleto: string
    postoGraduacao: string
    situacao: 'ATIVO' | 'AFASTADO' | 'TRANSFERIDO' | 'RESERVA'
    subunidade: {
      id: number
      sigla: string
      nome: string
    }
  }
  periodo: {
    id: number
    dataInicio: string
    dataFim: string
    status: 'ABERTO'
  } | null
  arranchamentos: Array<{
    id: number
    data: string
    refeicao: Refeicao
  }>
  escalasServico: Array<{
    id: number
    data: string
  }>
  ferias: Array<{
    id: number
    dataInicio: string
    dataFim: string
    laranjeira: boolean
  }>
  feriados: Array<{
    id: number
    data: string
    descricao: string
  }>
}

const refeicoes: Array<{
  codigo: Refeicao
  rotulo: string
}> = [
  { codigo: 'CAFE', rotulo: 'Café' },
  { codigo: 'ALMOCO', rotulo: 'Almoço' },
  { codigo: 'JANTA', rotulo: 'Janta' },
]

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
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(data))
}

function formatarDataCompleta(data: string) {
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

function gerarDatas(dataInicio: string, dataFim: string) {
  const datas: string[] = []
  const atual = new Date(`${somenteData(dataInicio)}T00:00:00.000Z`)
  const fim = new Date(`${somenteData(dataFim)}T00:00:00.000Z`)

  while (atual <= fim) {
    datas.push(atual.toISOString().slice(0, 10))
    atual.setUTCDate(atual.getUTCDate() + 1)
  }

  return datas
}

function criarChave(data: string, refeicao: Refeicao) {
  return `${data}|${refeicao}`
}

function estaNoFimDeSemana(data: string) {
  const dia = new Date(`${data}T00:00:00.000Z`).getUTCDay()
  return dia === 0 || dia === 6
}

function obterFeriasNaData(
  contexto: ContextoArranchamento,
  data: string,
) {
  return contexto.ferias.find(
    (ferias) =>
      data >= somenteData(ferias.dataInicio) &&
      data <= somenteData(ferias.dataFim),
  )
}

function obterSelecoesValidas(contexto: ContextoArranchamento) {
  const datasGu = new Set(
    contexto.escalasServico.map((escala) => somenteData(escala.data)),
  )

  return new Set(
    contexto.arranchamentos
      .filter((item) => {
        const data = somenteData(item.data)
        const ferias = obterFeriasNaData(contexto, data)

        return !datasGu.has(data) && (!ferias || ferias.laranjeira)
      })
      .map((item) =>
        criarChave(somenteData(item.data), item.refeicao),
      ),
  )
}

function gerarHash(selecoes: Set<string>) {
  return [...selecoes].sort().join(';')
}

async function buscarMeuArranchamento(signal?: AbortSignal) {
  const response = await http.get<ContextoArranchamento>(
    '/arranchamentos/meu',
    { signal },
  )

  return response.data
}

export function MeuArranchamentoPage() {
  const [contexto, setContexto] =
    useState<ContextoArranchamento | null>(null)
  const [selecoes, setSelecoes] = useState<Set<string>>(
    new Set(),
  )
  const [hashSalvo, setHashSalvo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const datas = useMemo(() => {
    if (!contexto?.periodo) {
      return []
    }

    return gerarDatas(
      contexto.periodo.dataInicio,
      contexto.periodo.dataFim,
    )
  }, [contexto])

  const datasGu = useMemo(
    () =>
      new Set(
        contexto?.escalasServico.map((escala) =>
          somenteData(escala.data),
        ) ?? [],
      ),
    [contexto],
  )

  const alterado = gerarHash(selecoes) !== hashSalvo

  useEffect(() => {
    const controller = new AbortController()
    let componenteAtivo = true

    buscarMeuArranchamento(controller.signal)
      .then((resultado) => {
        if (componenteAtivo) {
          const selecoesIniciais = obterSelecoesValidas(resultado)

          setContexto(resultado)
          setSelecoes(selecoesIniciais)
          setHashSalvo(gerarHash(selecoesIniciais))
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

  function alternarRefeicao(data: string, refeicao: Refeicao) {
    const chave = criarChave(data, refeicao)

    setSelecoes((estadoAtual) => {
      const proximoEstado = new Set(estadoAtual)

      if (proximoEstado.has(chave)) {
        proximoEstado.delete(chave)
      } else {
        proximoEstado.add(chave)
      }

      return proximoEstado
    })

    setErro('')
    setMensagem('')
  }

  async function salvarArranchamento() {
    setErro('')
    setMensagem('')
    setSalvando(true)

    const itens = [...selecoes].map((chave) => {
      const [data, refeicao] = chave.split('|')

      return {
        data,
        refeicao: refeicao as Refeicao,
      }
    })

    try {
      await http.put('/arranchamentos/meu', {
        itens,
      })

      setHashSalvo(gerarHash(selecoes))
      setMensagem('Arranchamento salvo com sucesso.')
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <main className="dashboard">
        <section className="user-card">
          <p>Carregando arranchamento...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard ranch-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Arranchamento individual</p>
          <h1>Meu arranchamento</h1>
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

      {!contexto?.periodo ? (
        <section className="user-card empty-period-card">
          <p className="eyebrow">Arranchamento</p>
          <h2>Nenhum período disponível</h2>
          <p className="section-description">
            Aguarde o Furriel abrir o próximo ciclo semanal.
          </p>
        </section>
      ) : contexto.usuario.situacao !== 'ATIVO' ? (
        <section className="user-card empty-period-card">
          <p className="eyebrow">Arranchamento indisponível</p>
          <h2>Situação do militar: {contexto.usuario.situacao}</h2>
          <p className="section-description">
            Sua situação atual não permite realizar arranchamento.
          </p>
        </section>
      ) : (
        <>
          <section className="user-card ranch-summary">
            <div>
              <p className="eyebrow">Período aberto</p>
              <h2>
                {formatarDataCompleta(contexto.periodo.dataInicio)} a{' '}
                {formatarDataCompleta(contexto.periodo.dataFim)}
              </h2>
              <p className="section-description">
                Marque as refeições que realizará no quartel.
              </p>
            </div>

            <div className="ranch-save-area">
              <span>
                {selecoes.size} refeição(ões) selecionada(s)
              </span>
              <button
                type="button"
                onClick={() => void salvarArranchamento()}
                disabled={salvando || !alterado}
              >
                {salvando
                  ? 'Salvando...'
                  : alterado
                    ? 'Salvar arranchamento'
                    : 'Arranchamento salvo'}
              </button>
            </div>
          </section>

          <section className="ranch-days-grid">
            {datas.map((data) => {
              const guServico = datasGu.has(data)
              const ferias = obterFeriasNaData(contexto, data)
              const bloqueadoPorFerias =
                Boolean(ferias) && !ferias?.laranjeira
              const feriado = contexto.feriados.find(
                (item) => somenteData(item.data) === data,
              )
              const fimDeSemana = estaNoFimDeSemana(data)

              return (
                <article
                  className={`user-card ranch-day-card${guServico ? ' duty' : ''}${bloqueadoPorFerias ? ' blocked' : ''}`}
                  key={data}
                >
                  <header>
                    <div>
                      <p className="eyebrow">
                        {formatarDiaSemana(data)}
                      </p>
                      <h2>{formatarData(data)}</h2>
                    </div>

                    {guServico && (
                      <span className="status active">GU de serviço</span>
                    )}

                    {bloqueadoPorFerias && (
                      <span className="status inactive">Férias</span>
                    )}
                  </header>

                  {(fimDeSemana || feriado) && !guServico && (
                    <div className="date-alert">
                      {feriado
                        ? `Feriado: ${feriado.descricao}`
                        : 'Atenção: esta data é fim de semana.'}
                    </div>
                  )}

                  {ferias?.laranjeira && !guServico && (
                    <div className="orange-alert">
                      Férias — militar laranjeira autorizado.
                    </div>
                  )}

                  {guServico ? (
                    <div className="automatic-meals">
                      <p>Arranchamento automático:</p>
                      <div className="meal-badges">
                        <span>Café</span>
                        <span>Almoço</span>
                        <span>Janta</span>
                        <span>Ceia</span>
                      </div>
                    </div>
                  ) : bloqueadoPorFerias ? (
                    <div className="blocked-day-message">
                      Arranchamento bloqueado durante as férias.
                    </div>
                  ) : (
                    <div className="meal-options">
                      {refeicoes.map((refeicao) => {
                        const chave = criarChave(
                          data,
                          refeicao.codigo,
                        )
                        const selecionada = selecoes.has(chave)

                        return (
                          <label
                            className={
                              selecionada
                                ? 'meal-option selected'
                                : 'meal-option'
                            }
                            key={refeicao.codigo}
                          >
                            <input
                              type="checkbox"
                              checked={selecionada}
                              onChange={() =>
                                alternarRefeicao(
                                  data,
                                  refeicao.codigo,
                                )
                              }
                            />
                            <span>{refeicao.rotulo}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        </>
      )}
    </main>
  )
}