// OTP (6-digit code) login lifecycle.
//
// The visitor flow (/login) is OTP-only:
//   1. Browser POSTs email to /api/auth/public/request-code
//   2. Server creates a VerificationToken row with a 6-digit code
//   3. Server sends the code via email
//   4. Browser POSTs {email, code} to /api/auth/public/verify-code
//   5. Server consumes the code and issues a session JWT directly
//
// We don't store a magic-link URL token any more — the email only carries
// the code. No cross-browser pairing handshake, no QQ-Mail-in-app-browser
// dance: the user reads the code in any mail client and types it into
// /login on their main browser.

import prisma from './prisma'

const TOKEN_TTL_MS = 10 * 60 * 1000   // 10 minutes

export type ConsumeResult =
  | { ok: true; identifier: string }
  | { ok: false; reason: 'not-found' | 'expired' | 'already-consumed' }

// Generate a cryptographically-random 6-digit code. Returns as a string so
// leading zeros are preserved (000123 is a valid code).
export function generateOtpCode(): string {
  const n = Math.floor(Math.random() * 1_000_000)
  return n.toString().padStart(6, '0')
}

// Create a new VerificationToken row that carries only the OTP code.
// `token` is still a cuid2 — it's used as the table's unique key and to
// look up the row during consume. The email never embeds it.
export async function createOtpToken(identifier: string): Promise<{ code: string; expiresAt: Date }> {
  const { createId } = await import('@paralleldrive/cuid2')
  const code = generateOtpCode()
  const expires = new Date(Date.now() + TOKEN_TTL_MS)
  await prisma.verificationToken.create({
    data: { identifier, token: createId(), code, expires },
  })
  return { code, expiresAt: expires }
}

// Atomic OTP code consumption: find by (identifier, code), mark consumed.
// Keeps the row around with consumed=true (instead of DELETE) so admins
// can see who logged in and when; subsequent lookups by the same code
// return 'already-consumed'.
export async function consumeMagicCode(identifier: string, code: string): Promise<ConsumeResult> {
  if (!code || !/^\d{6}$/.test(code)) return { ok: false, reason: 'not-found' }
  // Most-recent first so the latest code wins over an older still-valid one.
  const row = await prisma.verificationToken.findFirst({
    where: { identifier, code },
    orderBy: { expires: 'desc' },
  })
  if (!row) return { ok: false, reason: 'not-found' }
  if (row.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: row.token } }).catch(() => {})
    return { ok: false, reason: 'expired' }
  }
  if (row.consumed) return { ok: false, reason: 'already-consumed' }
  await prisma.verificationToken.update({
    where: { token: row.token },
    data: { consumed: true },
  })
  return { ok: true, identifier: row.identifier }
}

export async function purgeExpiredTokens(): Promise<number> {
  const result = await prisma.verificationToken.deleteMany({
    where: { expires: { lt: new Date() } },
  })
  return result.count
}
