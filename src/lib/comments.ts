import { createHash } from 'crypto'
import type { PrismaClient } from '@prisma/client'

export const COMMENT_MIN_LEN = 1
export const COMMENT_MAX_LEN = 2000
export const COMMENT_GLOBAL_RATE_WINDOW_MS = 60_000
export const COMMENT_GLOBAL_RATE_THRESHOLD = 30
export const COMMENT_IP_RATE_WINDOW_MS = 60_000
export const COMMENT_IP_RATE_MAX = 10

const BREAKER_KEY = 'comments_breaker_open'
const BREAKER_REASON_KEY = 'comments_breaker_reason'
const BREAKER_TRIPPED_AT_KEY = 'comments_breaker_tripped_at'

export type BreakerState = {
  open: boolean
  reason: 'manual' | 'auto' | null
  trippedAt: string | null
}

export async function getBreaker(prisma: PrismaClient): Promise<BreakerState> {
  const [openRow, reasonRow, trippedRow] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { key: BREAKER_KEY } }),
    prisma.siteConfig.findUnique({ where: { key: BREAKER_REASON_KEY } }),
    prisma.siteConfig.findUnique({ where: { key: BREAKER_TRIPPED_AT_KEY } }),
  ])
  return {
    open: openRow?.value === 'true',
    reason: (reasonRow?.value as BreakerState['reason']) ?? null,
    trippedAt: trippedRow?.value ?? null,
  }
}

export async function setBreaker(prisma: PrismaClient, state: BreakerState): Promise<void> {
  const wasOpen = (await prisma.siteConfig.findUnique({ where: { key: BREAKER_KEY } }))?.value === 'true'
  const transitioningToOpen = state.open && !wasOpen

  await Promise.all([
    prisma.siteConfig.upsert({
      where: { key: BREAKER_KEY },
      update: { value: state.open ? 'true' : 'false' },
      create: { key: BREAKER_KEY, value: state.open ? 'true' : 'false' },
    }),
    prisma.siteConfig.upsert({
      where: { key: BREAKER_REASON_KEY },
      update: { value: state.reason ?? '' },
      create: { key: BREAKER_REASON_KEY, value: state.reason ?? '' },
    }),
    prisma.siteConfig.upsert({
      where: { key: BREAKER_TRIPPED_AT_KEY },
      update: { value: state.trippedAt ?? '' },
      create: { key: BREAKER_TRIPPED_AT_KEY, value: state.trippedAt ?? '' },
    }),
  ])

  // When breaker transitions to open, retroactively hide all currently VISIBLE
  // comments. Per the "兜底策略，隐藏所有评论" spec: the breaker is a hard stop
  // for public visibility, not just for future submissions.
  if (transitioningToOpen) {
    await prisma.comment.updateMany({
      where: { status: 'VISIBLE' },
      data: { status: 'HIDDEN' },
    })
  }
}

export function getRequestIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return '0.0.0.0'
}

export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

export function sanitizeComment(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.replace(/\r\n/g, '\n').trim()
  if (trimmed.length < COMMENT_MIN_LEN || trimmed.length > COMMENT_MAX_LEN) return null
  return trimmed
}