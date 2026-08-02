import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Server-side gate for /u/[username]/edit. Three checks:
//   - Not logged in → /login (with callbackUrl back to this page).
//   - Logged in but the route username doesn't match the session's
//     username AND DB doesn't agree either → /u/[routeUsername] (the
//     public profile; can't edit someone else's profile from this URL).
//   - Session JWT is stale (says no username) but DB shows the user IS
//     the legitimate owner of this profile → fall through and let the
//     page mount. save() will resync the JWT via updateSession().
//
// Without the third check, a stale-JWT owner gets bounced to /u/[username]
// by what looks like a "wrong user" check, even though they ARE the owner
// — observed as "click 编辑资料 no response" after the OnboardingLayout
// stale-JWT guard sent them here from /onboarding.
export default async function ProfileEditLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=' + encodeURIComponent(`/u/${username}/edit`))
  }
  if (session.user.username !== username) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true },
    })
    if (me?.username !== username) {
      redirect(`/u/${username}`)
    }
  }
  return <>{children}</>
}