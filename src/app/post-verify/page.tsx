// Intermediate page hit immediately after a successful magic-link sign-in.
// Decides where the user actually goes:
//   - session.user.onboarded === false  → /onboarding
//   - session.user.isAdmin && wants /admin → /admin (admin's separate flow uses /api/auth/verify)
//   - else → callbackUrl (default '/')
//
// This is a Server Component so we can read the JWT session without a
// round-trip through /api/users/me.

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function PostVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login?error=session-missing')
  }
  const { callbackUrl } = await searchParams
  const safeCallback =
    callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
      ? callbackUrl
      : '/'

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, isAdmin: true, deletedAt: true },
  })
  if (!user || user.deletedAt) {
    redirect('/login?error=account-deleted')
  }

  if (!user.onboarded) {
    redirect(`/onboarding?callbackUrl=${encodeURIComponent(safeCallback)}`)
  }

  redirect(safeCallback)
}