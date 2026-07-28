import { NextRequest, NextResponse } from 'next/server'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { createMagicToken } from '@/lib/magic-link'
import { sendMagicLink } from '@/lib/email'
import { checkRateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip') ?? '0.0.0.0'
    const limit = checkRateLimit(`magic:${ip}`, 5, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试。' },
        { status: 429 },
      )
    }

    const { token, expiresAt } = await createMagicToken(email)
    const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin
    const url = `${baseUrl.replace(/\/$/, '')}/api/auth/verify?token=${encodeURIComponent(token)}`

    const result = await sendMagicLink({ to: email, url })

    const isDevMode = !process.env.DIRECT_MAIL_ACCESS_KEY_ID
    return NextResponse.json({
      ok: true,
      via: result.ok ? result.via : 'failed',
      ...(isDevMode && result.ok ? { debugLink: url, expiresAt } : {}),
      ...(!result.ok ? { error: result.error } : {}),
    })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}