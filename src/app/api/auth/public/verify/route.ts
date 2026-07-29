// Public magic-link verify endpoint. After signIn succeeds, we redirect to
// /login/success — a clear "✅ 登录成功" page with a 3s auto-redirect to
// the user's callbackUrl.
//
// P5: also accepts a `pair` query param. Before calling signIn (which
// consumes the row by setting consumed=true), we mark `paired=true` on
// the VerificationToken row. Browser A's polling at /api/auth/pair-status
// then finds the row, sees paired=true + !consumed, generates a JWT, and
// sets the session cookie on browser A's response — even though browser B
// (the email viewer) was the one that clicked the link.

import { NextRequest } from 'next/server'
import { signIn } from '@/lib/auth'
import { peekMagicToken, markPaired } from '@/lib/magic-link'
import { redirect } from 'next/navigation'

export const runtime = 'nodejs'

function sanitizeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const pairToken = req.nextUrl.searchParams.get('pair') ?? ''
  if (!token) {
    return redirect('/login?error=missing-token')
  }

  // Peek only — actual single-use consume happens inside NextAuth's
  // authorize callback. Doing it here too would race with signIn.
  const peek = await peekMagicToken(token)
  if (!peek.ok) {
    const reason =
      peek.reason === 'expired' ? 'token-expired'
      : peek.reason === 'already-consumed' ? 'token-invalid'
      : 'token-invalid'
    return redirect(`/login?error=${reason}`)
  }

  const callbackUrl = sanitizeCallbackUrl(req.nextUrl.searchParams.get('callbackUrl'))
  const successUrl = `/login/success?callbackUrl=${encodeURIComponent(callbackUrl)}`

  // CRITICAL ORDER: mark paired=true BEFORE signIn. signIn's authorize
  // callback will set consumed=true on this same row, but the row stays
  // around (we changed consume from DELETE to UPDATE for exactly this
  // reason). Browser A polls /api/auth/pair-status with pairToken and
  // finds this row.
  if (pairToken) {
    await markPaired(token)
  }

  try {
    await signIn('magic-link', { token, redirectTo: successUrl })
  } catch (e) {
    if (e instanceof Error && (e.message === 'NEXT_REDIRECT' || (e as { digest?: string }).digest?.startsWith?.('NEXT_REDIRECT'))) {
      throw e
    }
    console.error('[verify/public] signIn failed:', e)
    return redirect('/login?error=signin-failed')
  }

  return redirect(successUrl)
}