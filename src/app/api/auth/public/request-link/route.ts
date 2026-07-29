// Public registration / login endpoint. Used by /login page.
// Same magic-link mechanism as /api/auth/request-link, but:
//   - Auto-creates a User record if email is new (open registration per Q1)
//   - Embeds redirectTo=/post-verify in the magic-link URL so /api/auth/public/verify
//     can route new users to /onboarding and existing users back to their origin

import { NextRequest, NextResponse } from 'next/server'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { createMagicToken } from '@/lib/magic-link'
import { sendMagicLink } from '@/lib/email'
import { checkRateLimit } from '@/lib/rateLimit'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const callbackUrl = typeof body.callbackUrl === 'string' ? body.callbackUrl : null

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
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
            username: null,           // set during /onboarding
            isAdmin: false,
            onboarded: false,
            notifyOnReply: true,
            notifyOnNewPost: false,
          },
        })
        isNewUser = true
      } catch (e) {
        // Race: another concurrent request created the user. Re-fetch.
        user = await prisma.user.findUnique({ where: { email } })
        if (!user) throw e
      }
    } else if (user.deletedAt) {
      // Soft-deleted account can't be re-logged-in via this flow. Surface
      // a clear error so the UI can guide them to contact the admin.
      return NextResponse.json(
        { error: '该账号已被注销，无法登录' },
        { status: 403 },
      )
    }

    const { token, expiresAt } = await createMagicToken(email)
    const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin
    // Always send through /post-verify so we can route new users to
    // onboarding. /post-verify will then bounce to callbackUrl or /.
    const verifyPath = `/api/auth/public/verify?token=${encodeURIComponent(token)}${
      callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ''
    }`
    const url = `${baseUrl.replace(/\/$/, '')}${verifyPath}`

    const result = await sendMagicLink({ to: email, url })

    const isDevMode = !process.env.DIRECT_MAIL_ACCESS_KEY_ID
    return NextResponse.json({
      ok: true,
      isNewUser,
      via: result.ok ? result.via : 'failed',
      ...(isDevMode && result.ok ? { debugLink: url, expiresAt } : {}),
      ...(!result.ok ? { error: result.error } : {}),
    })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}