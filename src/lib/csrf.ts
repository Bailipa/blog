import crypto from 'crypto'
import logger from './logger'

const TOKEN_LENGTH = 32
const tokens = new Map<string, number>()

const TOKEN_TTL = 60 * 60 * 1000

export function generateToken(): string {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
  tokens.set(token, Date.now() + TOKEN_TTL)
  return token
}

export function verifyToken(token: string): boolean {
  if (!token || !tokens.has(token)) return false
  const expiresAt = tokens.get(token)!
  if (Date.now() > expiresAt) {
    tokens.delete(token)
    return false
  }
  return true
}

export function consumeToken(token: string): boolean {
  const valid = verifyToken(token)
  tokens.delete(token)
  return valid
}

export function getCsrfToken(): string {
  const token = generateToken()
  return token
}

export function validateCsrfToken(token: string | null): boolean {
  if (!token) {
    logger.warn('CSRF token missing')
    return false
  }
  return consumeToken(token)
}
