import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client.js'

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
  connectionLimit: 10,
})

export const prisma = new PrismaClient({ adapter })