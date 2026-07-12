import type { CookieOptions } from 'express'

const refreshTokenDays = Number(
  process.env.REFRESH_TOKEN_DAYS ?? 7,
)

if (
  !Number.isInteger(refreshTokenDays) ||
  refreshTokenDays <= 0
) {
  throw new Error('REFRESH_TOKEN_DAYS deve ser um número positivo.')
}

export const refreshCookieName = 'arranchamento_refresh'

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/auth',
  maxAge: refreshTokenDays * 24 * 60 * 60 * 1000,
}