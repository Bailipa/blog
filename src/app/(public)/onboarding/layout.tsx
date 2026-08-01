import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Server-side gate for /onboarding. Two checks:
//   - Not logged in → /login (this page sets a username; can't do that
//     without a session).
//   - Already onboarded → / (don't loop them through a form they don't
//     need to fill in again).
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=' + encodeURIComponent('/onboarding'))
  }
  if (session.user.username) {
    redirect('/')
  }
  return <>{children}</>
}