// Public magic-link verify endpoint. After signIn succeeds, we redirect to
// /post-verify which then decides whether to bounce the user to /onboarding
// (first-time login) or to their original page (callbackUrl, default '/').

import { NextRequest } from 'next/server'
import { signIn } from '@/lib/auth'
import { peekMagicToken } from '@/lib/magic-link'
import { redirect } from 'next/navigation'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return redirect('/login?error=missing-token')
  }

  // Peek only — actual single-use consume happens inside NextAuth's
  // authorize callback. Doing it here too would race with signIn.
  const peek = await peekMagicToken(token)
  if (!peek.ok) {
    const reason = peek.reason === 'expired' ? 'token-expired' : 'token-invalid'
    return redirect(`/login?error=${reason}`)
  }

  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') ?? '/'
  // Always pass through /post-verify so first-time users get bounced to
  // /onboarding, and existing users go straight to callbackUrl.
  const postVerify = `/post-verify?callbackUrl=${encodeURIComponent(callbackUrl)}`

  try {
    await signIn('magic-link', { token, redirectTo: postVerify })
  } catch (e) {
    if (e instanceof Error && (e.message === 'NEXT_REDIRECT' || (e as { digest?: string }).digest?.startsWith?.('NEXT_REDIRECT'))) {
      throw e
    }
    console.error('[verify/public] signIn failed:', e)
    return redirect('/login?error=signin-failed')
  }

  return redirect(postVerify)
}