const secret = process.env.JWT_ACCESS_SECRET

if (!secret || secret.length < 32) {
  throw new Error('JWT_ACCESS_SECRET precisa ter pelo menos 32 caracteres.')
}

export const jwtSecret = new TextEncoder().encode(secret)

export const jwtConfig = {
  issuer: 'arranchamento-api',
  audience: 'arranchamento-web',
} as const