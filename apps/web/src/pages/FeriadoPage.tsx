import axios from 'axios'
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'
import '../App.css'

type Feriado = {
  id: number
  data: string
  descricao: string
  createdAt: string
  cadastradoPor: {
    id: number
    militar: {
      nomeGuerra: string
      postoGraduacao: string
    }
  }
}

type ListarFeriadosResponse = {
  feriados: Feriado[]
}

type SalvarFeriadoResponse = {
  feriado: Feriado
  mensagem: string
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
    dateStyle: 'long',
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

export function FeriadosPage() {
  const anoAtual = new Date().getFullYear()
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [ano, setAno] = useState(anoAtual)
  const [busca, setBusca] = useState('')
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')
  const [feriadoEmEdicao, setFeriadoEmEdicao] =
    useState<Feriado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    let ativo = true

    http
      .get<ListarFeriadosResponse>('/feriados', {
        params: {
          ano,
        },
      })
      .then((response) => {
        if (ativo) {
          setFeriados(response.data.feriados)
          setErro('')
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          setErro(obterMensagemErro(error))
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false)
        }
      })

    return () => {
      ativo = false
    }
  }, [ano])

  const feriadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')

    if (!termo) {
      return feriados
    }

    return feriados.filter((feriado) =>
      [
        feriado.descricao,
        formatarData(feriado.data),
        formatarDiaSemana(feriado.data),
      ].some((valor) =>
        valor.toLocaleLowerCase('pt-BR').includes(termo),
      ),
    )
  }, [busca, feriados])

  async function carregarFeriados(anoSelecionado = ano) {
    const response = await http.get<ListarFeriadosResponse>(
      '/feriados',
      {
        params: {
          ano: anoSelecionado,
        },
      },
    )

    setFeriados(response.data.feriados)
  }

  function limparFormulario() {
    setData('')
    setDescricao('')
    setFeriadoEmEdicao(null)
  }

  function iniciarEdicao(feriado: Feriado) {
    setFeriadoEmEdicao(feriado)
    setData(somenteData(feriado.data))
    setDescricao(feriado.descricao)
    setErro('')
    setMensagem('')
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErro('')
    setMensagem('')
    setSalvando(true)

    try {
      const response = feriadoEmEdicao
        ? await http.patch<SalvarFeriadoResponse>(
            `/feriados/${feriadoEmEdicao.id}`,
            {
              data,
              descricao,
            },
          )
        : await http.post<SalvarFeriadoResponse>('/feriados', {
            data,
            descricao,
          })

      const anoDoFeriado = Number(data.slice(0, 4))

      limparFormulario()
      setMensagem(response.data.mensagem)

      if (anoDoFeriado !== ano) {
        setAno(anoDoFeriado)
        setCarregando(true)
      } else {
        await carregarFeriados()
      }
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  async function excluirFeriado(feriado: Feriado) {
    if (
      !window.confirm(
        `Excluir o feriado “${feriado.descricao}” de ${formatarData(feriado.data)}?`,
      )
    ) {
      return
    }

    setErro('')
    setMensagem('')
    setExcluindoId(feriado.id)

    try {
      await http.delete(`/feriados/${feriado.id}`)
      setMensagem('Feriado excluído com sucesso.')
      await carregarFeriados()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setExcluindoId(null)
    }
  }

  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <main className="dashboard holidays-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Calendário operacional</p>
          <h1>Feriados</h1>
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

      <div className="holidays-layout">
        <section className="user-card holiday-form-card">
          <p className="eyebrow">
            {feriadoEmEdicao ? 'Edição' : 'Novo registro'}
          </p>
          <h2>
            {feriadoEmEdicao ? 'Editar feriado' : 'Cadastrar feriado'}
          </h2>
          <p className="section-description">
            O aviso aparecerá automaticamente no arranchamento.
          </p>

          <form className="management-form" onSubmit={handleSubmit}>
            <label>
              Data
              <input
                type="date"
                value={data}
                onChange={(event) => setData(event.target.value)}
                required
              />
            </label>

            <label>
              Descrição
              <input
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Ex.: Independência do Brasil"
                minLength={3}
                maxLength={120}
                required
              />
            </label>

            <div className="holiday-form-actions">
              <button type="submit" disabled={salvando}>
                {salvando
                  ? 'Salvando...'
                  : feriadoEmEdicao
                    ? 'Salvar alterações'
                    : 'Cadastrar feriado'}
              </button>

              {feriadoEmEdicao && (
                <button
                  type="button"
                  className="secondary"
                  onClick={limparFormulario}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="user-card holidays-list-card">
          <div className="section-heading">
            <div>
              <h2>Calendário de {ano}</h2>
              <p className="section-description">
                {feriadosFiltrados.length} registro(s)
              </p>
            </div>

            <div className="year-navigation">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setCarregando(true)
                  setAno((anoSelecionado) => anoSelecionado - 1)
                }}
              >
                ←
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setCarregando(true)
                  setAno(anoAtual)
                }}
              >
                Ano atual
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setCarregando(true)
                  setAno((anoSelecionado) => anoSelecionado + 1)
                }}
              >
                →
              </button>
            </div>
          </div>

          <label className="holiday-search">
            Buscar no calendário
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Descrição, data ou dia da semana"
            />
          </label>

          {carregando ? (
            <p>Carregando feriados...</p>
          ) : feriadosFiltrados.length === 0 ? (
            <div className="empty-state">
              Nenhum feriado encontrado para {ano}.
            </div>
          ) : (
            <div className="holidays-list">
              {feriadosFiltrados.map((feriado) => {
                const dataFeriado = somenteData(feriado.data)
                const passado = dataFeriado < hoje

                return (
                  <article
                    className={`holiday-item${passado ? ' past' : ''}`}
                    key={feriado.id}
                  >
                    <time dateTime={dataFeriado}>
                      <strong>
                        {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit',
                          timeZone: 'UTC',
                        }).format(new Date(feriado.data))}
                      </strong>
                      <span>
                        {new Intl.DateTimeFormat('pt-BR', {
                          month: 'short',
                          timeZone: 'UTC',
                        })
                          .format(new Date(feriado.data))
                          .replace('.', '')}
                      </span>
                    </time>

                    <div className="holiday-info">
                      <div>
                        <h3>{feriado.descricao}</h3>
                        <span>{formatarDiaSemana(feriado.data)}</span>
                      </div>
                      <small>
                        Cadastrado por{' '}
                        {feriado.cadastradoPor.militar.postoGraduacao}{' '}
                        {feriado.cadastradoPor.militar.nomeGuerra}
                      </small>
                    </div>

                    <div className="holiday-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => iniciarEdicao(feriado)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="table-action danger-action"
                        disabled={excluindoId === feriado.id}
                        onClick={() => void excluirFeriado(feriado)}
                      >
                        {excluindoId === feriado.id
                          ? 'Excluindo...'
                          : 'Excluir'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}