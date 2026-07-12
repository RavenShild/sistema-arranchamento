import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import {
  CodigoPerfil,
  PrismaClient,
} from '../src/generated/prisma/client.js'

function requiredEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Variável obrigatória não encontrada: ${name}`)
  }

  return value
}

const adapter = new PrismaMariaDb({
  host: requiredEnv('DATABASE_HOST'),
  port: Number(requiredEnv('DATABASE_PORT')),
  user: requiredEnv('DATABASE_USER'),
  password: requiredEnv('DATABASE_PASSWORD'),
  database: requiredEnv('DATABASE_NAME'),
  connectionLimit: 5,
})

const prisma = new PrismaClient({ adapter })

const permissoes = [
  {
    codigo: 'refeicao:ler',
    descricao: 'Consultar refeições disponíveis',
  },
  {
    codigo: 'refeicao:criar',
    descricao: 'Cadastrar novas refeições',
  },
  {
    codigo: 'refeicao:editar',
    descricao: 'Alterar refeições cadastradas',
  },
  {
    codigo: 'refeicao:encerrar',
    descricao: 'Encerrar ou cancelar refeições',
  },
  {
    codigo: 'arranchamento:proprio:criar',
    descricao: 'Realizar o próprio arranchamento',
  },
  {
    codigo: 'arranchamento:proprio:cancelar',
    descricao: 'Cancelar o próprio arranchamento',
  },
  {
    codigo: 'arranchamento:subunidade:gerenciar',
    descricao: 'Gerenciar arranchamentos da subunidade',
  },
  {
    codigo: 'arranchamento:global:ler',
    descricao: 'Consultar todos os arranchamentos',
  },
  {
    codigo: 'arranchamento:periodo:gerenciar',
    descricao: 'Abrir e fechar períodos de arranchamento',
  },
  {
    codigo: 'escala:servico:gerenciar',
    descricao: 'Gerenciar a escala da guarnição de serviço',
  },
  {
    codigo: 'ferias:gerenciar',
    descricao: 'Cadastrar e alterar períodos de férias',
  },
  {
    codigo: 'feriado:gerenciar',
    descricao: 'Gerenciar feriados e datas especiais',
  },
  {
    codigo: 'militar:subunidade:ler',
    descricao: 'Consultar militares da subunidade',
  },
  {
    codigo: 'militar:subunidade:gerenciar',
    descricao: 'Gerenciar militares da subunidade',
  },
  {
    codigo: 'militar:gerenciar',
    descricao: 'Gerenciar todos os militares',
  },
  {
    codigo: 'relatorio:subunidade:ler',
    descricao: 'Consultar relatórios da subunidade',
  },
  {
    codigo: 'relatorio:global:ler',
    descricao: 'Consultar relatórios gerais',
  },
  {
    codigo: 'usuario:gerenciar',
    descricao: 'Gerenciar usuários e perfis',
  },
  {
    codigo: 'auditoria:ler',
    descricao: 'Consultar registros de auditoria',
  },
] as const

const perfis = [
  {
    codigo: CodigoPerfil.MILITAR,
    nome: 'Militar',
    descricao: 'Usuário militar do sistema',
    permissoes: [
      'refeicao:ler',
      'arranchamento:proprio:criar',
      'arranchamento:proprio:cancelar',
    ],
  },
  {
    codigo: CodigoPerfil.FURRIEL,
    nome: 'Furriel',
    descricao: 'Responsável pelo efetivo da subunidade',
    permissoes: [
      'refeicao:ler',
      'arranchamento:proprio:criar',
      'arranchamento:proprio:cancelar',
      'arranchamento:subunidade:gerenciar',
      'arranchamento:periodo:gerenciar',
      'escala:servico:gerenciar',
      'feriado:gerenciar',
      'militar:subunidade:ler',
      'relatorio:subunidade:ler',
    ],
  },
  {
    codigo: CodigoPerfil.APROVISIONAMENTO,
    nome: 'Aprovisionamento',
    descricao: 'Responsável pelo planejamento das refeições',
    permissoes: [
      'refeicao:ler',
      'refeicao:criar',
      'refeicao:editar',
      'refeicao:encerrar',
      'arranchamento:global:ler',
      'relatorio:global:ler',
    ],
  },
  {
    codigo: CodigoPerfil.SARGENTEANTE,
    nome: 'Sargenteante',
    descricao: 'Responsável pelo controle do efetivo',
    permissoes: [
      'refeicao:ler',
      'militar:subunidade:ler',
      'militar:subunidade:gerenciar',
      'ferias:gerenciar',
      'relatorio:subunidade:ler',
    ],
  },
  {
    codigo: CodigoPerfil.ADMINISTRADOR,
    nome: 'Administrador',
    descricao: 'Acesso administrativo completo',
    permissoes: permissoes.map((permissao) => permissao.codigo),
  },
] as const

async function main() {
  const permissoesPorCodigo = new Map<string, number>()

  for (const permissao of permissoes) {
    const registro = await prisma.permissao.upsert({
      where: {
        codigo: permissao.codigo,
      },
      update: {
        descricao: permissao.descricao,
      },
      create: permissao,
    })

    permissoesPorCodigo.set(registro.codigo, registro.id)
  }

  for (const perfil of perfis) {
    const registro = await prisma.perfil.upsert({
      where: {
        codigo: perfil.codigo,
      },
      update: {
        nome: perfil.nome,
        descricao: perfil.descricao,
      },
      create: {
        codigo: perfil.codigo,
        nome: perfil.nome,
        descricao: perfil.descricao,
      },
    })

    await prisma.$transaction([
      prisma.perfilPermissao.deleteMany({
        where: {
          perfilId: registro.id,
        },
      }),
      prisma.perfilPermissao.createMany({
        data: perfil.permissoes.map((codigo) => ({
          perfilId: registro.id,
          permissaoId: permissoesPorCodigo.get(codigo)!,
        })),
      }),
    ])
  }

  console.log('Perfis e permissões cadastrados com sucesso.')
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })