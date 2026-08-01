import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Server-side gate for /login. If already logged in, bounce to home —
// otherwise the page would render the login form for an authenticated
// user, which is confusing (and lets them request codes for the email
// they're already logged in as, wasting rate-limit budget).
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.id) {
    redirect('/')
  }
  return <>{children}</>
}