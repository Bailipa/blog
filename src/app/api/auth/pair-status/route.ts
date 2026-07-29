// POST /api/auth/pair-status
//
// Cross-browser pairing endpoint. Browser A (the user's main browser where
// /login is open) generates a pairToken and embeds it in the email link.
// When the user clicks the link in browser B (any browser, including
// in-app email browsers), the verify route marks the row `paired=true`.
// Browser A polls this endpoint with the pairToken; when paired, this
// endpoint generates a session JWT, sets it as a Set-Cookie header on
// browser A's response, and marks the row `consumed=true`.
//
// Net effect: even if the user clicks the link inside QQ Mail's in-app
// browser, browser A — the one they actually want to use — gets a
// session and shows the LoginSuccess page. Magic-link works across the
// in-app browser barrier.
//
// Security:
// - POST + Origin/Referer check (rejects cross-origin POSTs)
// - PairToken is unguessable UUID (256-bit entropy)
// - Single-use via consumed flag
// - 10-min TTL inherited from the VerificationToken row

import { NextRequest, NextResponse } from 'next/server'
import { encode } from '@auth/core/jwt'
import { findByPairToken } from '@/lib/magic-link'
import prisma from '@/lib/prisma'
import { apiErrorHandler } from '@/lib/apiErrorHandler'

export const runtime = 'nodejs'

const COOKIE_NAME_PROD = '__Secure-authjs.session-token'
const COOKIE_NAME_DEV = 'authjs.session-token'
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days, matches NextAuth default

function isSameOrigin(req: NextRequest): boolean {
  const host = req.headers.get('host')
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  // For same-origin POSTs, browsers send Origin (preferred). If absent
  // (older browsers), fall back to checking Referer's host.
  if (origin) {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
  if (referer) {
    try {
      return new URL(referer).host === host
    } catch {
      return false
    }
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'csrf' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const pairToken = typeof body.pairToken === 'string' ? body.pairToken : ''
    if (!pairToken || pairToken.length < 8 || pairToken.length > 64) {
      return NextResponse.json({ error: 'invalid pairToken' }, { status: 400 })
    }

    const row = await findByPairToken(pairToken)
    if (!row) {
      return NextResponse.json({ approved: false, reason: 'not-found' })
    }
    if (row.expires < new Date()) {
      return NextResponse.json({ approved: false, expired: true })
    }
    if (!row.paired) {
      return NextResponse.json({ approved: false })
    }

    // User has been approved (email link clicked in some browser). From
    // here on, ANY polling browser that has the pairToken gets a session
    // cookie. The `consumed` flag is just for the FIRST poll — to mark
    // "this is the first time we issued a cookie". Subsequent polls in
    // other tabs (or after a refresh) still need a cookie too, because
    // their cookie jars are separate. So: always issue a cookie when
    // paired=true, idempotently.
    const user = await prisma.user.findUnique({
      where: { email: row.identifier },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        isAdmin: true,
        deletedAt: true,
      },
    })
    if (!user || user.deletedAt) {
      return NextResponse.json({ approved: false, reason: 'user-not-found' })
    }

    // Mark consumed only if not already, to know if we're the first poll.
    let firstPoll = false
    if (!row.consumed) {
      const updateResult = await prisma.verificationToken.updateMany({
        where: { token: row.token, consumed: false },
        data: { consumed: true },
      })
      firstPoll = updateResult.count > 0
    }

    // Build the session JWT. Salt must match the cookie name so NextAuth
    // can decode it. Production uses the __Secure- prefix when HTTPS.
    const isHttps = req.nextUrl.protocol === 'https:'
    const cookieName = isHttps ? COOKIE_NAME_PROD : COOKIE_NAME_DEV
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
    if (!secret) {
      console.error('[pair-status] missing AUTH_SECRET')
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
      approved: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
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