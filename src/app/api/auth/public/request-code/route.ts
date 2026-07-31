// Public registration / login endpoint. Used by /login page.
//
// Flow: browser POSTs {email}, server creates a VerificationToken row with
// a 6-digit code, server sends the code by email. Browser then POSTs
// {email, code} to /api/auth/public/verify-code to mint a session JWT.
//
// New emails auto-register a User (mirrors the previous magic-link
// behavior — no separate /register page).

import { NextRequest, NextResponse } from 'next/server'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { createOtpToken } from '@/lib/magic-link'
import { sendOtpCode } from '@/lib/email'
import { checkRateLimit } from '@/lib/rateLimit'
import prisma from '@/lib/prisma'

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
    const limit = checkRateLimit(`otp:public:${ip}`, 5, 60_000)
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

    const { code, expiresAt } = await createOtpToken(email)
    const result = await sendOtpCode({ to: email, code })

    const isDevMode = !process.env.DIRECT_MAIL_ACCESS_KEY_ID
    return NextResponse.json({
      ok: true,
      isNewUser,
      via: result.ok ? result.via : 'failed',
      // In dev mode (no SMTP), surface the code so the local UI can use it
      // without leaving the page.
      ...(isDevMode && result.ok ? { debugCode: code, expiresAt } : {}),
      ...(!result.ok ? { error: result.error } : {}),
    })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
