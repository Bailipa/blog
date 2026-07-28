import { NextRequest } from 'next/server'
import { signIn } from '@/lib/auth'
import { consumeMagicToken } from '@/lib/magic-link'
import { redirect } from 'next/navigation'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return redirect('/admin/login?error=missing-token')
  }

  const result = await consumeMagicToken(token)
  if (!result.ok) {
    const reason = result.reason === 'expired' ? 'token-expired' : 'token-invalid'
    return redirect(`/admin/login?error=${reason}`)
  }

  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') ?? '/admin'
  try {
    await signIn('magic-link', { token, redirectTo: callbackUrl })
  } catch (e) {
    // signIn throws a redirect on success. Re-throw so Next.js handles it.
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    return redirect(`/admin/login?error=signin-failed`)
  }

  // signIn should always redirect on success, but as a safety net:
  return redirect(callbackUrl)
}