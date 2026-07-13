import axios from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { http } from '../api/http'
import '../App.css'

const postosComandante = [
  'General de Brigada',
  'Coronel',
  'Tenente-coronel',
  'Major',
  'Capitão',
] as const

type ConfiguracaoOm = {
  id: number
  nome: string
  sigla: string
  postoComandante: (typeof postosComandante)[number]
  nomeComandante: string
  updatedAt: string
  atualizadoPor: {
    id: number
    militar: {
      nomeGuerra: string
      postoGraduacao: string
    }
  }
}

type ObterConfiguracaoOmResponse = {
  configuracao: ConfiguracaoOm | null
}

type SalvarConfiguracaoOmResponse = {
  configuracao: ConfiguracaoOm
  mensagem: string
}

function obterMensagemErro(error: unknown) {
  if (axios.isAxiosError<{ erro?: string }>(error)) {
    return (
      error.response?.data.erro ??
      'Não foi possível salvar as configurações da OM.'
    )
  }

  return 'Não foi possível salvar as configurações da OM.'
}

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(data))
}

export function ConfiguracaoOmPage() {
  const [nome, setNome] = useState('')
  const [sigla, setSigla] = useState('')
  const [postoComandante, setPostoComandante] =
    useState<(typeof postosComandante)[number]>('Coronel')
  const [nomeComandante, setNomeComandante] = useState('')
  const [configuracao, setConfiguracao] =
    useState<ConfiguracaoOm | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    let ativo = true

    http
      .get<ObterConfiguracaoOmResponse>('/configuracao-om')
      .then((response) => {
        if (!ativo || !response.data.configuracao) {
          return
        }

        const dados = response.data.configuracao

        setConfiguracao(dados)
        setNome(dados.nome)
        setSigla(dados.sigla)
        setPostoComandante(dados.postoComandante)
        setNomeComandante(dados.nomeComandante)
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErro('')
    setMensagem('')
    setSalvando(true)

    try {
      const response = await http.put<SalvarConfiguracaoOmResponse>(
        '/configuracao-om',
        {
          nome,
          sigla,
          postoComandante,
          nomeComandante,
        },
      )

      const dados = response.data.configuracao

      setConfiguracao(dados)
      setNome(dados.nome)
      setSigla(dados.sigla)
      setPostoComandante(dados.postoComandante)
      setNomeComandante(dados.nomeComandante)
      setMensagem(response.data.mensagem)
    } catch (error) {
      setErro(obterMensagemErro(error))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="dashboard organization-settings-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Configurações da OM</h1>
        </div>

        <Link className="secondary link-button" to="/">
          Voltar
        </Link>
      </header>

      <div className="organization-settings-layout">
        <section className="user-card organization-settings-card">
          <div>
            <p className="eyebrow">Identificação institucional</p>
            <h2>Dados da Organização Militar</h2>
            <p className="section-description">
              Estas informações serão exibidas nos relatórios e
              documentos emitidos pelo sistema.
            </p>
          </div>

          {carregando ? (
            <p>Carregando configurações...</p>
          ) : (
            <form
              className="management-form organization-settings-form"
              onSubmit={handleSubmit}
            >
              <label>
                Nome completo da OM
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Ex.: 10º Batalhão de Infantaria"
                  maxLength={160}
                  required
                />
              </label>

              <label>
                Sigla da OM
                <input
                  value={sigla}
                  onChange={(event) => setSigla(event.target.value)}
                  placeholder="Ex.: 10º BI"
                  maxLength={30}
                  required
                />
              </label>

              <div className="organization-commander-fields">
                <label>
                  Posto do Comandante
                  <select
                    value={postoComandante}
                    onChange={(event) =>
                      setPostoComandante(
                        event.target.value as (
                          typeof postosComandante
                        )[number],
                      )
                    }
                    required
                  >
                    {postosComandante.map((posto) => (
                      <option key={posto} value={posto}>
                        {posto}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Nome do Comandante
                  <input
                    value={nomeComandante}
                    onChange={(event) =>
                      setNomeComandante(event.target.value)
                    }
                    placeholder="Nome completo ou nome de guerra"
                    maxLength={160}
                    required
                  />
                </label>
              </div>

              <button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </form>
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
        </section>

        <aside className="user-card organization-preview-card">
          <p className="eyebrow">Pré-visualização</p>
          <h2>{nome || 'Organização Militar'}</h2>
          <strong>{sigla || 'SIGLA DA OM'}</strong>

          <div className="organization-commander-preview">
            <span>Comandante da OM</span>
            <strong>
              {postoComandante} {nomeComandante || '—'}
            </strong>
          </div>

          {configuracao && (
            <p className="organization-update-info">
              Última atualização em{' '}
              {formatarDataHora(configuracao.updatedAt)}, por{' '}
              {configuracao.atualizadoPor.militar.postoGraduacao}{' '}
              {configuracao.atualizadoPor.militar.nomeGuerra}.
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}