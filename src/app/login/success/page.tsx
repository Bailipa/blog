// Landing page after a successful magic-link click. Renders the shared
// <LoginSuccess> client component with the current session's user info.
//
// If somehow we land here without a session (e.g., the user opened the URL
// directly), redirect to /login so they can request a fresh link.

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { LoginSuccess } from '@/components/auth/LoginSuccess'

export const dynamic = 'force-dynamic'

export default async function LoginSuccessPage({
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
    select: {
      username: true,
      name: true,
      email: true,
      avatarUrl: true,
      isAdmin: true,
      onboarded: true,
      deletedAt: true,
    },
  })
  if (!user || user.deletedAt) {
    redirect('/login?error=account-deleted')
  }

  return (
    <LoginSuccess
      user={{
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        onboarded: user.onboarded,
      }}
      callbackUrl={safeCallback}
    />
  )
}