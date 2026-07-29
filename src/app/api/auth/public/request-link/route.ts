// Public registration / login endpoint. Used by /login page.
//
// P5: now also accepts a `pairToken` from the requesting browser. The email
// link embeds this pairToken; when the user clicks the link in any browser
// (including in-app email browsers), the click marks `paired=true` on the
// row, and the original browser's polling at /api/auth/pair-status picks
// that up to install a session cookie on the polling browser itself. This
// makes the magic-link work even if it opens in QQ Mail's in-app browser.
//
// The email also contains a 6-digit OTP code as fallback — if the original
// browser was closed or the pairing timed out, the user can still type the
// code into /login.

import { NextRequest, NextResponse } from 'next/server'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { createMagicTokenAndCode } from '@/lib/magic-link'
import { sendMagicLink } from '@/lib/email'
import { checkRateLimit } from '@/lib/rateLimit'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Pair token format: any non-empty string up to 64 chars. We accept
// whatever the browser generated (UUID recommended but we don't constrain
// to UUID format — could be any unguessable string).
const PAIR_TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const callbackUrl = typeof body.callbackUrl === 'string' ? body.callbackUrl : null
    const pairToken = typeof body.pairToken === 'string' ? body.pairToken : ''

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }
    if (pairToken && !PAIR_TOKEN_RE.test(pairToken)) {
      return NextResponse.json({ error: 'pairToken 格式不正确' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip') ?? '0.0.0.0'
    const limit = checkRateLimit(`magic:public:${ip}`, 5, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试。' },
        { status: 429 },
      )
    }

    // Find or auto-create the User. We never overwrite an existing record.
    let user = await prisma.user.findUnique({ where: { email } })
    let isNewUser = false
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            email,
            username: null,
            isAdmin: false,
            onboarded: false,
            notifyOnReply: true,
            notifyOnNewPost: false,
          },
        })
        isNewUser = true
      } catch (e) {
        user = await prisma.user.findUnique({ where: { email } })
        if (!user) throw e
      }
    } else if (user.deletedAt) {
      return NextResponse.json(
        { error: '该账号已被注销，无法登录' },
        { status: 403 },
      )
    }

    // Mint a token + 6-digit code, both attached to the same row, both
    // linked to pairToken (if provided) so the original browser can detect
    // pairing completion.
    const { token, code, expiresAt } = await createMagicTokenAndCode(email, pairToken)

    const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin
    const verifyPath = `/api/auth/public/verify?token=${encodeURIComponent(token)}${
      pairToken ? `&pair=${encodeURIComponent(pairToken)}` : ''
    }${
      callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ''
    }`
    const url = `${baseUrl.replace(/\/$/, '')}${verifyPath}`

    const result = await sendMagicLink({ to: email, url, code })

    const isDevMode = !process.env.DIRECT_MAIL_ACCESS_KEY_ID
    return NextResponse.json({
      ok: true,
      isNewUser,
      via: result.ok ? result.via : 'failed',
      // In dev mode (no SMTP), surface the code + link so the local UI can
      // copy them by hand. The /login page renders them in a debug box.
      ...(isDevMode && result.ok ? { debugLink: url, debugCode: code, expiresAt } : {}),
      ...(!result.ok ? { error: result.error } : {}),
    })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}