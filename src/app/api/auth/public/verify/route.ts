// Public magic-link verify endpoint. After signIn succeeds, we redirect to
// /login/success — a clear "✅ 登录成功" page with a 3s auto-redirect to
// the user's callbackUrl (or '/'). The user sees explicit confirmation
// instead of being silently bounced to /onboarding or callbackUrl.
//
// /post-verify is kept as a server-side fallback for any old/direct access.

import { NextRequest } from 'next/server'
import { signIn } from '@/lib/auth'
import { peekMagicToken } from '@/lib/magic-link'
import { redirect } from 'next/navigation'

export const runtime = 'nodejs'

function sanitizeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return redirect('/login?error=missing-token')
  }

  // Peek only — actual single-use consume happens inside NextAuth's
  // authorize callback. Doing it here too would race with signIn and
  // produce a token-invalid error on first click.
  const peek = await peekMagicToken(token)
  if (!peek.ok) {
    const reason = peek.reason === 'expired' ? 'token-expired' : 'token-invalid'
    return redirect(`/login?error=${reason}`)
  }

  const callbackUrl = sanitizeCallbackUrl(req.nextUrl.searchParams.get('callbackUrl'))
  const successUrl = `/login/success?callbackUrl=${encodeURIComponent(callbackUrl)}`

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