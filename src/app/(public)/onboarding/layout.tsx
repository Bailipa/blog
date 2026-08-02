import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Server-side gate for /onboarding. Three checks:
//   - Not logged in → /login (this page sets a username; can't do that
//     without a session).
//   - Already onboarded (per JWT) → /u/[username]/edit (was '/'; redirect
//     to the edit page so the user lands somewhere useful).
//   - Already onboarded (per DB, JWT stale) → same redirect. Without this
//     last check, a user whose JWT was issued before their username was
//     set would see "完善资料" in the dropdown, click it, and bounce
//     straight back to '/' in one frame — perceived as "can't enter".
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=' + encodeURIComponent('/onboarding'))
  }

  // Fast path: JWT is fresh.
  if (session.user.username) {
    redirect(`/u/${session.user.username}/edit`)
  }

  // Slow path / stale-JWT guard: trust the DB. If the user is onboarded
  // there but the JWT doesn't know (stale cookie, missing `sub`, or the
  // stale-JWT branch in auth.ts never ran), don't let them land on a
  // page that's about to instantly redirect them away.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, onboarded: true },
  })
  if (me?.username && me.onboarded) {
    redirect(`/u/${me.username}/edit`)
  }

  return <>{children}</>
}