import axios from 'axios'
import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'
import '../App.css'

type AcaoAuditoria = 'CRIACAO' | 'ALTERACAO' | 'EXCLUSAO'

type Auditoria = {
  id: number
  acao: AcaoAuditoria
  recurso: string
  recursoId: string | null
  metodo: string
  rota: string
  statusHttp: number
  dados: unknown
  ip: string | null
  userAgent: string | null
  createdAt: string
  usuario: {
    id: number
    militar: {
      identidadeMilitar: string
      nomeGuerra: string
      postoGraduacao: string
    }
  } | null
}

type AuditoriasResponse = {
  auditorias: Auditoria[]
  paginacao: {
    pagina: number
    limite: number
    total: number
    totalPaginas: number
  }
}

type FiltrosAuditoria = {
  acao: '' | AcaoAuditoria
  recurso: string
  usuarioId: string
  dataInicio: string
  dataFim: string
}

const filtrosVazios: FiltrosAuditoria = {
  acao: '',
  recurso: '',
  usuarioId: '',
  dataInicio: '',
  dataFim: '',
}

const nomesRecursos: Record<string, string> = {
  admin: 'Administração inicial',
  arranchamentos: 'Arranchamentos',
  auth: 'Autenticação e senha',
  'configuracao-om': 'Configurações da OM',
  escalas: 'GU de serviço',
  feriados: 'Feriados',
  ferias: 'Férias',
  militares: 'Militares',
  periodos: 'Períodos semanais',
  subunidades: 'Subunidades',
  usuarios: 'Usuários e acessos',
}

const nomesAcoes: Record<AcaoAuditoria, string> = {
  CRIACAO: 'Inclusão/ação',
  ALTERACAO: 'Alteração',
  EXCLUSAO: 'Exclusão',
}

function obterMensagemErro(error: unknown) {
  if (axios.isAxiosError<{ erro?: string }>(error)) {
    return (
      error.response?.data.erro ??
      'Não foi possível consultar o histórico de auditoria.'
    )
  }

  return 'Não foi possível consultar o histórico de auditoria.'
}

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(data))
}

function formatarDados(dados: unknown) {
  if (dados === undefined || dados === null) {
    return 'Nenhum dado adicional registrado.'
  }

  return JSON.stringify(dados, null, 2)
}

function obterNomeRecurso(recurso: string) {
  return nomesRecursos[recurso] ?? recurso
}

export function AuditoriaPage() {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([])
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    limite: 25,
    total: 0,
    totalPaginas: 1,
  })
  const [pagina, setPagina] = useState(1)
  const [filtros, setFiltros] =
    useState<FiltrosAuditoria>(filtrosVazios)
  const [filtrosAplicados, setFiltrosAplicados] =
    useState<FiltrosAuditoria>(filtrosVazios)
  const [revisao, setRevisao] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    http
      .get<AuditoriasResponse>('/auditorias', {
        params: {
          pagina,
          limite: 25,
          acao: filtrosAplicados.acao || undefined,
          recurso: filtrosAplicados.recurso || undefined,
          usuarioId: filtrosAplicados.usuarioId || undefined,
          dataInicio: filtrosAplicados.dataInicio || undefined,
          dataFim: filtrosAplicados.dataFim || undefined,
        },
      })
      .then((response) => {
        if (!ativo) {
          return
        }

        setAuditorias(response.data.auditorias)
        setPaginacao(response.data.paginacao)
        setErro('')
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
  }, [filtrosAplicados, pagina, revisao])

  function handleFiltrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      filtros.dataInicio &&
      filtros.dataFim &&
      filtros.dataFim < filtros.dataInicio
    ) {
      setErro('A data final não pode ser anterior à data inicial.')
      return
    }

    setErro('')
    setCarregando(true)
    setPagina(1)
    setFiltrosAplicados({ ...filtros })
  }

  function limparFiltros() {
    setFiltros(filtrosVazios)
    setFiltrosAplicados(filtrosVazios)
    setPagina(1)
    setCarregando(true)
    setErro('')
  }

  function mudarPagina(novaPagina: number) {
    setPagina(novaPagina)
    setCarregando(true)
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <main className="dashboard audit-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Administração e segurança</p>
          <h1>Histórico de auditoria</h1>
        </div>

        <Link className="secondary link-button" to="/">
          Voltar
        </Link>
      </header>

      <section className="user-card audit-filters-card">
        <div className="section-heading">
          <div>
            <h2>Filtrar registros</h2>
            <p className="section-description">
              Consulte quem realizou cada operação no sistema.
            </p>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={() => {
              setCarregando(true)
              setRevisao((valor) => valor + 1)
            }}
          >
            Atualizar
          </button>
        </div>

        <form className="audit-filters" onSubmit={handleFiltrar}>
          <label>
            Ação
            <select
              value={filtros.acao}
              onChange={(event) =>
                setFiltros((atuais) => ({
                  ...atuais,
                  acao: event.target.value as FiltrosAuditoria['acao'],
                }))
              }
            >
              <option value="">Todas</option>
              <option value="CRIACAO">Inclusão/ação</option>
              <option value="ALTERACAO">Alteração</option>
              <option value="EXCLUSAO">Exclusão</option>
            </select>
          </label>

          <label>
            Módulo
            <select
              value={filtros.recurso}
              onChange={(event) =>
                setFiltros((atuais) => ({
                  ...atuais,
                  recurso: event.target.value,
                }))
              }
            >
              <option value="">Todos</option>
              {Object.entries(nomesRecursos).map(([valor, nome]) => (
                <option key={valor} value={valor}>
                  {nome}
                </option>
              ))}
            </select>
          </label>

          <label>
            ID do usuário
            <input
              type="number"
              min="1"
              value={filtros.usuarioId}
              onChange={(event) =>
                setFiltros((atuais) => ({
                  ...atuais,
                  usuarioId: event.target.value,
                }))
              }
              placeholder="Ex.: 1"
            />
          </label>

          <label>
            Data inicial
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(event) =>
                setFiltros((atuais) => ({
                  ...atuais,
                  dataInicio: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Data final
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(event) =>
                setFiltros((atuais) => ({
                  ...atuais,
                  dataFim: event.target.value,
                }))
              }
            />
          </label>

          <div className="audit-filter-actions">
            <button type="submit">Aplicar filtros</button>
            <button
              type="button"
              className="secondary"
              onClick={limparFiltros}
            >
              Limpar
            </button>
          </div>
        </form>

        {erro && (
          <div className="error-message" role="alert">
            {erro}
          </div>
        )}
      </section>

      <section className="user-card audit-list-card">
        <div className="section-heading">
          <div>
            <h2>Operações registradas</h2>
            <p className="section-description">
              {paginacao.total} registro(s) encontrado(s)
            </p>
          </div>

          <span className="audit-page-indicator">
            Página {paginacao.pagina} de {paginacao.totalPaginas}
          </span>
        </div>

        {carregando ? (
          <p>Carregando histórico...</p>
        ) : auditorias.length === 0 ? (
          <div className="empty-state">
            Nenhuma operação encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="audit-list">
            {auditorias.map((auditoria) => (
              <article className="audit-item" key={auditoria.id}>
                <div className="audit-item-heading">
                  <div>
                    <span
                      className={`audit-action audit-action-${auditoria.acao.toLowerCase()}`}
                    >
                      {nomesAcoes[auditoria.acao]}
                    </span>
                    <strong>{obterNomeRecurso(auditoria.recurso)}</strong>
                  </div>

                  <time dateTime={auditoria.createdAt}>
                    {formatarDataHora(auditoria.createdAt)}
                  </time>
                </div>

                <div className="audit-item-grid">
                  <div>
                    <span>Responsável</span>
                    <strong>
                      {auditoria.usuario
                        ? `${auditoria.usuario.militar.postoGraduacao} ${auditoria.usuario.militar.nomeGuerra}`
                        : 'Usuário não disponível'}
                    </strong>
                    {auditoria.usuario && (
                      <small>
                        Identidade{' '}
                        {auditoria.usuario.militar.identidadeMilitar} ·
                        Usuário #{auditoria.usuario.id}
                      </small>
                    )}
                  </div>

                  <div>
                    <span>Operação</span>
                    <strong>
                      {auditoria.metodo} {auditoria.rota}
                    </strong>
                    <small>
                      HTTP {auditoria.statusHttp}
                      {auditoria.recursoId
                        ? ` · Registro #${auditoria.recursoId}`
                        : ''}
                    </small>
                  </div>

                  <div>
                    <span>Origem</span>
                    <strong>{auditoria.ip || 'IP não informado'}</strong>
                    <small title={auditoria.userAgent || undefined}>
                      {auditoria.userAgent
                        ? 'Navegador identificado'
                        : 'Navegador não informado'}
                    </small>
                  </div>
                </div>

                <details className="audit-details">
                  <summary>Visualizar dados registrados</summary>
                  <pre>{formatarDados(auditoria.dados)}</pre>
                </details>
              </article>
            ))}
          </div>
        )}

        {paginacao.totalPaginas > 1 && (
          <nav className="audit-pagination" aria-label="Paginação">
            <button
              type="button"
              className="secondary"
              disabled={pagina <= 1 || carregando}
              onClick={() => mudarPagina(pagina - 1)}
            >
              Anterior
            </button>

            <span>
              {paginacao.pagina} de {paginacao.totalPaginas}
            </span>

            <button
              type="button"
              className="secondary"
              disabled={
                pagina >= paginacao.totalPaginas || carregando
              }
              onClick={() => mudarPagina(pagina + 1)}
            >
              Próxima
            </button>
          </nav>
        )}
      </section>
    </main>
  )
}