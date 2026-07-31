// POST /api/auth/public/verify-code
//
// OTP verify. Browser POSTs the 6-digit code the user received in email;
// this endpoint validates the code, marks the row consumed, and issues a
// session JWT directly (rather than calling signIn() from a route handler,
// which is fragile — NextAuth's NEXT_REDIRECT throw isn't always handled
// cleanly outside server actions).
//
// Body: { email, code, callbackUrl? }

import { NextRequest, NextResponse } from 'next/server'
import { encode } from '@auth/core/jwt'
import { consumeMagicCode } from '@/lib/magic-link'
import prisma from '@/lib/prisma'
import { apiErrorHandler } from '@/lib/apiErrorHandler'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const COOKIE_NAME_PROD = '__Secure-authjs.session-token'
const COOKIE_NAME_DEV = 'authjs.session-token'
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

function sanitizeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const callbackUrl = sanitizeCallbackUrl(
      typeof body.callbackUrl === 'string' ? body.callbackUrl : null,
    )

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 })
    }

    const result = await consumeMagicCode(email, code)
    if (!result.ok) {
      const reason =
        result.reason === 'expired' ? '验证码已过期，请重新获取'
        : result.reason === 'already-consumed' ? '验证码已被使用'
        : '验证码不正确'
      return NextResponse.json({ error: reason }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: result.identifier },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        isAdmin: true,
        deletedAt: true,
        onboarded: true,
      },
    })
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: '账号不可用' }, { status: 403 })
    }

    // Generate session JWT directly. This avoids the signIn() /
    // NEXT_REDIRECT throw dance that's brittle inside route handlers.
    const isHttps = req.nextUrl.protocol === 'https:'
    const cookieName = isHttps ? COOKIE_NAME_PROD : COOKIE_NAME_DEV
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
    if (!secret) {
      console.error('[verify-code] missing AUTH_SECRET')
      return NextResponse.json({ error: 'server-misconfigured' }, { status: 500 })
    }
    const sessionToken = await encode({
      token: {
        id: user.id,
        name: user.name ?? user.username,
        username: user.username,
        email: user.email ?? undefined,
        isAdmin: user.isAdmin,
      },
      secret,
      salt: cookieName,
      maxAge: SESSION_MAX_AGE_SECONDS,
    })

    const response = NextResponse.json({
      ok: true,
      callbackUrl,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        onboarded: user.onboarded,
      },
    })
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    })
    return response
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}