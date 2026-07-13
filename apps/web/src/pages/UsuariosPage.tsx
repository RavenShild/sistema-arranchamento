import axios from 'axios'
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'
import { useAuth } from '../auth/auth.context'
import '../App.css'

type CodigoPerfil =
  | 'MILITAR'
  | 'FURRIEL'
  | 'APROVISIONAMENTO'
  | 'SARGENTEANTE'
  | 'ADMINISTRADOR'

type Perfil = {
  id: number
  codigo: CodigoPerfil
  nome: string
  descricao: string | null
}

type Militar = {
  id: number
  identidadeMilitar: string
  nomeCompleto: string
  nomeGuerra: string
  postoGraduacao: string
  subunidade: {
    id: number
    sigla: string
    nome: string
  }
}

type UsuarioAdministrado = {
  id: number
  email: string | null
  ativo: boolean
  primeiroAcesso: boolean
  ultimoLogin: string | null
  createdAt: string
  militar: Militar & {
    situacao: string
  }
  perfis: Array<{
    perfil: Pick<Perfil, 'id' | 'codigo' | 'nome'>
  }>
}

type ContextoUsuariosResponse = {
  militaresDisponiveis: Militar[]
  perfis: Perfil[]
}

type ListarUsuariosResponse = {
  usuarios: UsuarioAdministrado[]
}

type CriarUsuarioResponse = {
  usuario: UsuarioAdministrado
  senhaTemporaria: string
  mensagem: string
}

type AtualizarUsuarioResponse = {
  usuario: UsuarioAdministrado
  mensagem: string
}

type RedefinirSenhaResponse = {
  senhaTemporaria: string
  mensagem: string
}

type CredencialTemporaria = {
  nome: string
  login: string
  senha: string
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

function formatarDataHora(data: string | null) {
  if (!data) {
    return 'Nunca acessou'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(data))
}

function obterCodigosPerfis(usuario: UsuarioAdministrado) {
  return usuario.perfis.map((item) => item.perfil.codigo)
}

export function UsuariosPage() {
  const { usuario: usuarioAtual } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioAdministrado[]>([])
  const [militares, setMilitares] = useState<Militar[]>([])
  const [perfis, setPerfis] = useState<Perfil[]>([])
  const [militarId, setMilitarId] = useState('')
  const [email, setEmail] = useState('')
  const [perfisSelecionados, setPerfisSelecionados] = useState<
    CodigoPerfil[]
  >(['MILITAR'])
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('TODOS')
  const [usuarioEmEdicao, setUsuarioEmEdicao] =
    useState<UsuarioAdministrado | null>(null)
  const [emailEdicao, setEmailEdicao] = useState('')
  const [perfisEdicao, setPerfisEdicao] = useState<
    CodigoPerfil[]
  >([])
  const [credencial, setCredencial] =
    useState<CredencialTemporaria | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<
    number | null
  >(null)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    let ativo = true

    Promise.all([
      http.get<ListarUsuariosResponse>('/usuarios'),
      http.get<ContextoUsuariosResponse>('/usuarios/contexto'),
    ])
      .then(([usuariosResponse, contextoResponse]) => {
        if (!ativo) {
          return
        }

        setUsuarios(usuariosResponse.data.usuarios)
        setMilitares(contextoResponse.data.militaresDisponiveis)
        setPerfis(contextoResponse.data.perfis)
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
  }, [])

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')

    return usuarios.filter((usuario) => {
      const correspondeSituacao =
        filtroSituacao === 'TODOS' ||
        (filtroSituacao === 'ATIVOS' && usuario.ativo) ||
        (filtroSituacao === 'INATIVOS' && !usuario.ativo)

      if (!correspondeSituacao) {
        return false
      }

      if (!termo) {
        return true
      }

      return [
        usuario.email ?? '',
        usuario.militar.identidadeMilitar,
        usuario.militar.nomeCompleto,
        usuario.militar.nomeGuerra,
        usuario.militar.postoGraduacao,
        usuario.militar.subunidade.sigla,
        ...usuario.perfis.map((item) => item.perfil.nome),
      ].some((valor) =>
        valor.toLocaleLowerCase('pt-BR').includes(termo),
      )
    })
  }, [busca, filtroSituacao, usuarios])

  async function atualizarListas() {
    const [usuariosResponse, contextoResponse] = await Promise.all([
      http.get<ListarUsuariosResponse>('/usuarios'),
      http.get<ContextoUsuariosResponse>('/usuarios/contexto'),
    ])

    setUsuarios(usuariosResponse.data.usuarios)
    setMilitares(contextoResponse.data.militaresDisponiveis)
    setPerfis(contextoResponse.data.perfis)
  }

  function alternarPerfil(
    codigo: CodigoPerfil,
    selecionados: CodigoPerfil[],
    atualizar: (perfis: CodigoPerfil[]) => void,
  ) {
    atualizar(
      selecionados.includes(codigo)
        ? selecionados.filter((perfil) => perfil !== codigo)
        : [...selecionados, codigo],
    )
  }

  async function handleCriarUsuario(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (perfisSelecionados.length === 0) {
      setErro('Selecione pelo menos um perfil.')
      return
    }

    setErro('')
    setMensagem('')
    setCredencial(null)
    setSalvando(true)

    try {
      const response = await http.post<CriarUsuarioResponse>(
        '/usuarios',
        {
          militarId: Number(militarId),
          email,
          perfis: perfisSelecionados,
        },
      )

      setCredencial({
        nome: `${response.data.usuario.militar.postoGraduacao} ${response.data.usuario.militar.nomeGuerra}`,
        login: response.data.usuario.militar.identidadeMilitar,
        senha: response.data.senhaTemporaria,
      })
      setMilitarId('')
      setEmail('')
      setPerfisSelecionados(['MILITAR'])
      setMensagem('Usuário criado com sucesso.')
      await atualizarListas()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  function iniciarEdicao(usuario: UsuarioAdministrado) {
    setUsuarioEmEdicao(usuario)
    setEmailEdicao(usuario.email ?? '')
    setPerfisEdicao(obterCodigosPerfis(usuario))
    setErro('')
    setMensagem('')
    setCredencial(null)
  }

  async function handleSalvarEdicao(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!usuarioEmEdicao) {
      return
    }

    if (perfisEdicao.length === 0) {
      setErro('Selecione pelo menos um perfil.')
      return
    }

    setErro('')
    setMensagem('')
    setSalvando(true)

    try {
      const response = await http.patch<AtualizarUsuarioResponse>(
        `/usuarios/${usuarioEmEdicao.id}`,
        {
          email: emailEdicao,
          perfis: perfisEdicao,
        },
      )

      setMensagem(response.data.mensagem)
      setUsuarioEmEdicao(null)
      await atualizarListas()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  async function alterarSituacao(usuario: UsuarioAdministrado) {
    const acao = usuario.ativo ? 'desativar' : 'ativar'

    if (
      !window.confirm(
        `Deseja realmente ${acao} o usuário de ${usuario.militar.nomeGuerra}?`,
      )
    ) {
      return
    }

    setErro('')
    setMensagem('')
    setCredencial(null)
    setAcaoEmAndamento(usuario.id)

    try {
      const response = await http.patch<AtualizarUsuarioResponse>(
        `/usuarios/${usuario.id}`,
        {
          ativo: !usuario.ativo,
        },
      )

      setMensagem(response.data.mensagem)
      await atualizarListas()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  async function redefinirSenha(usuario: UsuarioAdministrado) {
    if (
      !window.confirm(
        `Gerar uma nova senha temporária para ${usuario.militar.nomeGuerra}? As sessões atuais serão encerradas.`,
      )
    ) {
      return
    }

    setErro('')
    setMensagem('')
    setCredencial(null)
    setAcaoEmAndamento(usuario.id)

    try {
      const response = await http.post<RedefinirSenhaResponse>(
        `/usuarios/${usuario.id}/redefinir-senha`,
      )

      setCredencial({
        nome: `${usuario.militar.postoGraduacao} ${usuario.militar.nomeGuerra}`,
        login: usuario.militar.identidadeMilitar,
        senha: response.data.senhaTemporaria,
      })
      setMensagem('Senha redefinida com sucesso.')
      await atualizarListas()
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  async function copiarCredencial() {
    if (!credencial) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        `Login: ${credencial.login}\nSenha temporária: ${credencial.senha}`,
      )
      setMensagem('Credencial copiada.')
    } catch {
      setErro('Não foi possível copiar. Selecione os dados manualmente.')
    }
  }

  return (
    <main className="dashboard users-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Usuários e acessos</h1>
        </div>

        <Link className="secondary link-button" to="/">
          Voltar
        </Link>
      </header>

      <section className="users-intro">
        <div>
          <strong>{usuarios.filter((usuario) => usuario.ativo).length}</strong>
          <span>Usuários ativos</span>
        </div>
        <div>
          <strong>{militares.length}</strong>
          <span>Militares sem acesso</span>
        </div>
        <div>
          <strong>
            {
              usuarios.filter((usuario) => usuario.primeiroAcesso)
                .length
            }
          </strong>
          <span>Aguardando primeira troca de senha</span>
        </div>
      </section>

      {credencial && (
        <section className="temporary-credential" role="status">
          <div>
            <p className="eyebrow">Exibição única</p>
            <h2>Credencial temporária</h2>
            <p>
              Entregue estes dados diretamente para{' '}
              <strong>{credencial.nome}</strong>. A senha não poderá
              ser consultada novamente.
            </p>
          </div>

          <dl>
            <div>
              <dt>Login</dt>
              <dd>{credencial.login}</dd>
            </div>
            <div>
              <dt>Senha temporária</dt>
              <dd>
                <code>{credencial.senha}</code>
              </dd>
            </div>
          </dl>

          <button type="button" onClick={() => void copiarCredencial()}>
            Copiar credencial
          </button>
        </section>
      )}

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

      <div className="users-layout">
        <section className="user-card users-create-card">
          <h2>Novo usuário</h2>
          <p className="section-description">
            Vincule o acesso a um militar ativo sem usuário.
          </p>

          <form className="management-form" onSubmit={handleCriarUsuario}>
            <label>
              Militar
              <select
                value={militarId}
                onChange={(event) => setMilitarId(event.target.value)}
                disabled={carregando || militares.length === 0}
                required
              >
                <option value="">Selecione</option>
                {militares.map((militar) => (
                  <option key={militar.id} value={militar.id}>
                    {militar.postoGraduacao} {militar.nomeGuerra} -{' '}
                    {militar.subunidade.sigla}
                  </option>
                ))}
              </select>
            </label>

            <label>
              E-mail opcional
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="militar@exemplo.mil.br"
                maxLength={160}
              />
            </label>

            <fieldset className="profile-fieldset">
              <legend>Perfis de acesso</legend>
              {perfis.map((perfil) => (
                <label key={perfil.id} className="profile-option">
                  <input
                    type="checkbox"
                    checked={perfisSelecionados.includes(perfil.codigo)}
                    onChange={() =>
                      alternarPerfil(
                        perfil.codigo,
                        perfisSelecionados,
                        setPerfisSelecionados,
                      )
                    }
                  />
                  <span>
                    <strong>{perfil.nome}</strong>
                    <small>{perfil.descricao}</small>
                  </span>
                </label>
              ))}
            </fieldset>

            <button
              type="submit"
              disabled={salvando || militares.length === 0}
            >
              {salvando ? 'Criando...' : 'Criar usuário'}
            </button>
          </form>

          {!carregando && militares.length === 0 && (
            <div className="empty-state">
              Todos os militares ativos já possuem acesso.
            </div>
          )}
        </section>

        <section className="user-card users-list-card">
          <div className="section-heading">
            <div>
              <h2>Usuários cadastrados</h2>
              <p className="section-description">
                {usuariosFiltrados.length} registro(s)
              </p>
            </div>
          </div>

          <div className="users-filters">
            <label>
              Buscar
              <input
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Nome, identidade, e-mail ou perfil"
              />
            </label>

            <label>
              Situação
              <select
                value={filtroSituacao}
                onChange={(event) =>
                  setFiltroSituacao(event.target.value)
                }
              >
                <option value="TODOS">Todos</option>
                <option value="ATIVOS">Ativos</option>
                <option value="INATIVOS">Inativos</option>
              </select>
            </label>
          </div>

          {carregando ? (
            <p>Carregando usuários...</p>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="empty-state">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="users-list">
              {usuariosFiltrados.map((usuario) => (
                <article className="managed-user" key={usuario.id}>
                  <div className="managed-user-header">
                    <div>
                      <div className="managed-user-title">
                        <h3>
                          {usuario.militar.postoGraduacao}{' '}
                          {usuario.militar.nomeGuerra}
                        </h3>
                        <span
                          className={
                            usuario.ativo
                              ? 'status active'
                              : 'status inactive'
                          }
                        >
                          {usuario.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p>
                        {usuario.militar.subunidade.sigla} · Identidade{' '}
                        {usuario.militar.identidadeMilitar}
                      </p>
                    </div>

                    {usuario.primeiroAcesso && (
                      <span className="first-access-badge">
                        Primeiro acesso
                      </span>
                    )}
                  </div>

                  <div className="managed-user-details">
                    <div>
                      <span>E-mail</span>
                      <strong>{usuario.email || 'Não informado'}</strong>
                    </div>
                    <div>
                      <span>Último acesso</span>
                      <strong>{formatarDataHora(usuario.ultimoLogin)}</strong>
                    </div>
                  </div>

                  <div className="profile-badges">
                    {usuario.perfis.map((item) => (
                      <span key={item.perfil.id}>
                        {item.perfil.nome}
                      </span>
                    ))}
                  </div>

                  <div className="managed-user-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => iniciarEdicao(usuario)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={acaoEmAndamento === usuario.id}
                      onClick={() => void redefinirSenha(usuario)}
                    >
                      Redefinir senha
                    </button>
                    <button
                      type="button"
                      className="table-action"
                      disabled={
                        acaoEmAndamento === usuario.id ||
                        (usuarioAtual?.id === usuario.id && usuario.ativo)
                      }
                      onClick={() => void alterarSituacao(usuario)}
                    >
                      {usuario.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {usuarioEmEdicao && (
        <div className="edit-user-backdrop" role="presentation">
          <section
            className="edit-user-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Editar acesso</p>
                <h2 id="edit-user-title">
                  {usuarioEmEdicao.militar.postoGraduacao}{' '}
                  {usuarioEmEdicao.militar.nomeGuerra}
                </h2>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setUsuarioEmEdicao(null)}
              >
                Fechar
              </button>
            </div>

            <form
              className="management-form"
              onSubmit={handleSalvarEdicao}
            >
              <label>
                E-mail opcional
                <input
                  type="email"
                  value={emailEdicao}
                  onChange={(event) =>
                    setEmailEdicao(event.target.value)
                  }
                  maxLength={160}
                />
              </label>

              <fieldset className="profile-fieldset">
                <legend>Perfis de acesso</legend>
                {perfis.map((perfil) => (
                  <label key={perfil.id} className="profile-option">
                    <input
                      type="checkbox"
                      checked={perfisEdicao.includes(perfil.codigo)}
                      onChange={() =>
                        alternarPerfil(
                          perfil.codigo,
                          perfisEdicao,
                          setPerfisEdicao,
                        )
                      }
                    />
                    <span>
                      <strong>{perfil.nome}</strong>
                      <small>{perfil.descricao}</small>
                    </span>
                  </label>
                ))}
              </fieldset>

              <button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}