import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

const host = env('DATABASE_HOST')
const port = env('DATABASE_PORT')
const user = env('DATABASE_USER')
const password = env('DATABASE_PASSWORD')
const database = env('DATABASE_NAME')
const shadowDatabase = env('SHADOW_DATABASE_NAME')

function createConnectionUrl(databaseName: string) {
  const encodedUser = encodeURIComponent(user)
  const encodedPassword = encodeURIComponent(password)

  return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${databaseName}`
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: createConnectionUrl(database),
    shadowDatabaseUrl: createConnectionUrl(shadowDatabase),
  },
})