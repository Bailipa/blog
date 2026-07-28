// Magic-link token lifecycle. cuid2 tokens (24-char, URL-safe), 15-min TTL,
// single-use. Backed by the VerificationToken table (standard NextAuth schema).

import { createId } from '@paralleldrive/cuid2'
import prisma from './prisma'

const TOKEN_TTL_MS = 15 * 60 * 1000

export async function createMagicToken(identifier: string): Promise<{ token: string; expiresAt: Date }> {
  const token = createId()
  const expires = new Date(Date.now() + TOKEN_TTL_MS)
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  })
  return { token, expiresAt: expires }
}

export type ConsumeResult =
  | { ok: true; identifier: string }
  | { ok: false; reason: 'not-found' | 'expired' }

export async function consumeMagicToken(token: string): Promise<ConsumeResult> {
  if (!token) return { ok: false, reason: 'not-found' }
  const row = await prisma.verificationToken.findUnique({ where: { token } })
  if (!row) return { ok: false, reason: 'not-found' }
  if (row.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
    return { ok: false, reason: 'expired' }
  }
  await prisma.verificationToken.delete({ where: { token } })
  return { ok: true, identifier: row.identifier }
}

export async function purgeExpiredTokens(): Promise<number> {
  const result = await prisma.verificationToken.deleteMany({
    where: { expires: { lt: new Date() } },
  })
  return result.count
}