import 'dotenv/config'
import * as argon2 from 'argon2'
import { CodigoPerfil } from '../src/generated/prisma/client.js'
import { prisma } from '../src/lib/prisma.js'

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Variável obrigatória não encontrada: ${name}`)
  }

  return value
}

async function main() {
  const senhaInicial = requiredEnv('ADMIN_INITIAL_PASSWORD')

  if (senhaInicial.length < 12) {
    throw new Error('A senha inicial deve possuir pelo menos 12 caracteres.')
  }

  const subunidade = await prisma.subunidade.upsert({
    where: {
      sigla: requiredEnv('ADMIN_SUBUNIDADE_SIGLA'),
    },
    update: {
      nome: requiredEnv('ADMIN_SUBUNIDADE_NOME'),
      ativa: true,
    },
    create: {
      sigla: requiredEnv('ADMIN_SUBUNIDADE_SIGLA'),
      nome: requiredEnv('ADMIN_SUBUNIDADE_NOME'),
    },
  })

  const militar = await prisma.militar.upsert({
    where: {
      identidadeMilitar: requiredEnv('ADMIN_IDENTIDADE'),
    },
    update: {
      nomeCompleto: requiredEnv('ADMIN_NOME_COMPLETO'),
      nomeGuerra: requiredEnv('ADMIN_NOME_GUERRA'),
      postoGraduacao: requiredEnv('ADMIN_POSTO_GRADUACAO'),
      situacao: 'ATIVO',
      subunidadeId: subunidade.id,
    },
    create: {
      identidadeMilitar: requiredEnv('ADMIN_IDENTIDADE'),
      nomeCompleto: requiredEnv('ADMIN_NOME_COMPLETO'),
      nomeGuerra: requiredEnv('ADMIN_NOME_GUERRA'),
      postoGraduacao: requiredEnv('ADMIN_POSTO_GRADUACAO'),
      situacao: 'ATIVO',
      subunidadeId: subunidade.id,
    },
  })

  const perfilAdministrador = await prisma.perfil.findUnique({
    where: {
      codigo: CodigoPerfil.ADMINISTRADOR,
    },
  })

  if (!perfilAdministrador) {
    throw new Error(
      'Perfil ADMINISTRADOR não encontrado. Execute primeiro o seed.',
    )
  }

  const usuarioExistente = await prisma.usuario.findUnique({
    where: {
      militarId: militar.id,
    },
  })

  if (usuarioExistente) {
    await prisma.usuarioPerfil.upsert({
      where: {
        usuarioId_perfilId: {
          usuarioId: usuarioExistente.id,
          perfilId: perfilAdministrador.id,
        },
      },
      update: {},
      create: {
        usuarioId: usuarioExistente.id,
        perfilId: perfilAdministrador.id,
      },
    })

    console.log('Administrador já existente. Perfil confirmado.')
    return
  }

  const senhaHash = await argon2.hash(senhaInicial, {
    type: argon2.argon2id,
  })

  const usuario = await prisma.usuario.create({
    data: {
      militarId: militar.id,
      email: process.env.ADMIN_EMAIL?.trim() || null,
      senhaHash,
      ativo: true,
      primeiroAcesso: true,
    },
  })

  await prisma.usuarioPerfil.create({
    data: {
      usuarioId: usuario.id,
      perfilId: perfilAdministrador.id,
    },
  })

  console.log('Administrador inicial criado com sucesso.')
}

main()
  .catch((error) => {
    console.error('Erro ao criar administrador:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })