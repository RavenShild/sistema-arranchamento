declare global {
  namespace Express {
    interface Request {
      auth?: {
        usuarioId: number
        perfis: string[]
        permissoes: string[]
      }
    }
  }
}

export {}