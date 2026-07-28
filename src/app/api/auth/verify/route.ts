import { NextRequest } from 'next/server'
import { signIn } from '@/lib/auth'
import { peekMagicToken } from '@/lib/magic-link'
import { redirect } from 'next/navigation'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return redirect('/admin/login?error=missing-token')
  }

  // Peek only — the actual single-use consume happens inside NextAuth's
  // authorize callback. Doing it here too would race with signIn and
  // produce a token-invalid error on first click.
  const result = await peekMagicToken(token)
  if (!result.ok) {
    const reason = result.reason === 'expired' ? 'token-expired' : 'token-invalid'
    return redirect(`/admin/login?error=${reason}`)
  }

  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') ?? '/admin'
  try {
    await signIn('magic-link', { token, redirectTo: callbackUrl })
  } catch (e) {
    // signIn throws a redirect (NEXT_REDIRECT) on success. Re-throw so
    // Next.js handles it; everything else is a real failure.
    if (e instanceof Error && (e.message === 'NEXT_REDIRECT' || (e as { digest?: string }).digest?.startsWith?.('NEXT_REDIRECT'))) {
      throw e
    }
    console.error('[verify] signIn failed:', e)
    return redirect(`/admin/login?error=signin-failed`)
  }

  return redirect(callbackUrl)
}