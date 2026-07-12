import axios from 'axios'
import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'

type SituacaoMilitar =
  | 'ATIVO'
  | 'AFASTADO'
  | 'TRANSFERIDO'
  | 'RESERVA'

type Subunidade = {
  id: number
  sigla: string
  nome: string
  ativa: boolean
}

type Militar = {
  id: number
  identidadeMilitar: string
  nomeCompleto: string
  nomeGuerra: string
  postoGraduacao: string
  situacao: SituacaoMilitar
  subunidadeId: number
  subunidade: Subunidade
  usuario: {
    id: number
    email: string | null
    ativo: boolean
  } | null
}

type ListarMilitaresResponse = {
  militares: Militar[]
}

type ListarSubunidadesResponse = {
  subunidades: Subunidade[]
}

type FiltrosMilitares = {
  busca: string
  situacao: string
  subunidadeId: string
}

const situacoes: Array<{
  valor: SituacaoMilitar
  rotulo: string
}> = [
  { valor: 'ATIVO', rotulo: 'Ativo' },
  { valor: 'AFASTADO', rotulo: 'Afastado' },
  { valor: 'TRANSFERIDO', rotulo: 'Transferido' },
  { valor: 'RESERVA', rotulo: 'Reserva' },
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

function obterRotuloSituacao(situacao: SituacaoMilitar) {
  return (
    situacoes.find((item) => item.valor === situacao)
      ?.rotulo ?? situacao
  )
}

async function buscarMilitares(
  filtros: FiltrosMilitares,
  signal?: AbortSignal,
) {
  const response = await http.get<ListarMilitaresResponse>(
    '/militares',
    {
      signal,
      params: {
        busca: filtros.busca || undefined,
        situacao: filtros.situacao || undefined,
        subunidadeId:
          filtros.subunidadeId || undefined,
      },
    },
  )

  return response.data.militares
}

async function buscarSubunidades(signal?: AbortSignal) {
  const response =
    await http.get<ListarSubunidadesResponse>(
      '/subunidades',
      { signal },
    )

  return response.data.subunidades
}

export function MilitaresPage() {
  const [militares, setMilitares] = useState<Militar[]>([])
  const [subunidades, setSubunidades] = useState<Subunidade[]>([])
  const [identidadeMilitar, setIdentidadeMilitar] = useState('')
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [nomeGuerra, setNomeGuerra] = useState('')
  const [postoGraduacao, setPostoGraduacao] = useState('')
  const [situacao, setSituacao] =
    useState<SituacaoMilitar>('ATIVO')
  const [subunidadeId, setSubunidadeId] = useState('')
  const [busca, setBusca] = useState('')
  const [situacaoFiltro, setSituacaoFiltro] = useState('')
  const [subunidadeFiltro, setSubunidadeFiltro] = useState('')
  const [militarEmEdicao, setMilitarEmEdicao] =
    useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let componenteAtivo = true

    Promise.all([
      buscarMilitares(
        {
          busca: '',
          situacao: '',
          subunidadeId: '',
        },
        controller.signal,
      ),
      buscarSubunidades(controller.signal),
    ])
      .then(([militaresEncontrados, subunidadesEncontradas]) => {
        if (componenteAtivo) {
          setMilitares(militaresEncontrados)
          setSubunidades(subunidadesEncontradas)
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
    setIdentidadeMilitar('')
    setNomeCompleto('')
    setNomeGuerra('')
    setPostoGraduacao('')
    setSituacao('ATIVO')
    setSubunidadeId('')
    setMilitarEmEdicao(null)
  }

  async function recarregarMilitares() {
    const resultado = await buscarMilitares({
      busca,
      situacao: situacaoFiltro,
      subunidadeId: subunidadeFiltro,
    })

    setMilitares(resultado)
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setErro('')
    setMensagem('')
    setSalvando(true)

    const dados = {
      identidadeMilitar,
      nomeCompleto,
      nomeGuerra,
      postoGraduacao,
      situacao,
      subunidadeId: Number(subunidadeId),
    }

    try {
      if (militarEmEdicao) {
        await http.patch(
          `/militares/${militarEmEdicao}`,
          dados,
        )
        setMensagem('Militar atualizado com sucesso.')
      } else {
        await http.post('/militares', dados)
        setMensagem('Militar cadastrado com sucesso.')
      }

      limparFormulario()
      await recarregarMilitares()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  async function handleFiltros(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setCarregando(true)

    try {
      await recarregarMilitares()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setCarregando(false)
    }
  }

  async function limparFiltros() {
    setBusca('')
    setSituacaoFiltro('')
    setSubunidadeFiltro('')
    setErro('')
    setMensagem('')
    setCarregando(true)

    try {
      const resultado = await buscarMilitares({
        busca: '',
        situacao: '',
        subunidadeId: '',
      })
      setMilitares(resultado)
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setCarregando(false)
    }
  }

  function editarMilitar(militar: Militar) {
    setIdentidadeMilitar(militar.identidadeMilitar)
    setNomeCompleto(militar.nomeCompleto)
    setNomeGuerra(militar.nomeGuerra)
    setPostoGraduacao(militar.postoGraduacao)
    setSituacao(militar.situacao)
    setSubunidadeId(String(militar.subunidadeId))
    setMilitarEmEdicao(militar.id)
    setErro('')
    setMensagem('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    limparFormulario()
    setErro('')
    setMensagem('')
  }

  return (
    <main className="dashboard military-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Militares</h1>
        </div>

        <Link className="secondary link-button" to="/">
          Voltar
        </Link>
      </header>

      <div className="management-grid military-grid">
        <section className="user-card">
          <h2>
            {militarEmEdicao
              ? 'Editar militar'
              : 'Novo militar'}
          </h2>

          <p className="section-description">
            Informe os dados funcionais do militar.
          </p>

          <form
            className="management-form"
            onSubmit={handleSubmit}
          >
            <label>
              Identidade militar
              <input
                value={identidadeMilitar}
                onChange={(event) =>
                  setIdentidadeMilitar(event.target.value)
                }
                maxLength={30}
                required
              />
            </label>

            <label>
              Nome completo
              <input
                value={nomeCompleto}
                onChange={(event) =>
                  setNomeCompleto(event.target.value)
                }
                maxLength={160}
                required
              />
            </label>

            <label>
              Nome de guerra
              <input
                value={nomeGuerra}
                onChange={(event) =>
                  setNomeGuerra(event.target.value)
                }
                maxLength={80}
                required
              />
            </label>

            <label>
              Posto/graduação
              <input
                value={postoGraduacao}
                onChange={(event) =>
                  setPostoGraduacao(event.target.value)
                }
                placeholder="Ex.: 1º Sgt"
                maxLength={50}
                required
              />
            </label>

            <label>
              Subunidade
              <select
                value={subunidadeId}
                onChange={(event) =>
                  setSubunidadeId(event.target.value)
                }
                required
              >
                <option value="">Selecione</option>
                {subunidades.map((subunidade) => (
                  <option
                    key={subunidade.id}
                    value={subunidade.id}
                    disabled={
                      !subunidade.ativa &&
                      String(subunidade.id) !== subunidadeId
                    }
                  >
                    {subunidade.sigla} — {subunidade.nome}
                    {!subunidade.ativa ? ' (inativa)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Situação
              <select
                value={situacao}
                onChange={(event) =>
                  setSituacao(
                    event.target.value as SituacaoMilitar,
                  )
                }
              >
                {situacoes.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-actions">
              <button type="submit" disabled={salvando}>
                {salvando
                  ? 'Salvando...'
                  : militarEmEdicao
                    ? 'Salvar alterações'
                    : 'Cadastrar'}
              </button>

              {militarEmEdicao && (
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
              <h2>Militares cadastrados</h2>
              <p className="section-description">
                {militares.length} registro(s)
              </p>
            </div>
          </div>

          <form
            className="filter-form"
            onSubmit={handleFiltros}
          >
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Identidade, nome ou posto/graduação"
            />

            <select
              value={situacaoFiltro}
              onChange={(event) =>
                setSituacaoFiltro(event.target.value)
              }
            >
              <option value="">Todas as situações</option>
              {situacoes.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </select>

            <select
              value={subunidadeFiltro}
              onChange={(event) =>
                setSubunidadeFiltro(event.target.value)
              }
            >
              <option value="">Todas as subunidades</option>
              {subunidades.map((subunidade) => (
                <option
                  key={subunidade.id}
                  value={subunidade.id}
                >
                  {subunidade.sigla}
                </option>
              ))}
            </select>

            <button type="submit" disabled={carregando}>
              Filtrar
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() => void limparFiltros()}
              disabled={carregando}
            >
              Limpar
            </button>
          </form>

          {carregando ? (
            <p>Carregando militares...</p>
          ) : militares.length === 0 ? (
            <div className="empty-state">
              Nenhum militar encontrado.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Identidade</th>
                    <th>Militar</th>
                    <th>Subunidade</th>
                    <th>Situação</th>
                    <th>Usuário</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>

                <tbody>
                  {militares.map((militar) => (
                    <tr key={militar.id}>
                      <td>{militar.identidadeMilitar}</td>
                      <td>
                        <strong>
                          {militar.postoGraduacao}{' '}
                          {militar.nomeGuerra}
                        </strong>
                        <small>{militar.nomeCompleto}</small>
                      </td>
                      <td>{militar.subunidade.sigla}</td>
                      <td>
                        <span
                          className={`status ${militar.situacao.toLowerCase()}`}
                        >
                          {obterRotuloSituacao(
                            militar.situacao,
                          )}
                        </span>
                      </td>
                      <td>
                        {militar.usuario
                          ? 'Criado'
                          : 'Não criado'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => editarMilitar(militar)}
                        >
                          Editar
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