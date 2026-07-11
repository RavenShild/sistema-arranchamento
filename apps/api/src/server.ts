import 'dotenv/config'
import { app } from './app.js'
import { prisma } from './lib/prisma.js'

const port = Number(process.env.PORT ?? 3333)

const server = app.listen(port, () => {
  console.log(`API executando em http://localhost:${port}`)
})

async function shutdown(signal: string) {
  console.log(`\nSinal ${signal} recebido. Encerrando API...`)

  server.close(async () => {
    await prisma.$disconnect()
    console.log('API encerrada corretamente.')
    process.exit(0)
  })
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})