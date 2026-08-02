import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Server-side gate for /u/[username]/edit. Two checks:
//   - Not logged in → /login (with callbackUrl back to this page).
//   - Logged in but the route username doesn't match the session's
//     username → /u/[routeUsername] (the public profile; can't edit
//     someone else's profile from this URL).
//
// Without this gate, both cases used to flash a "加载中…" placeholder
// for one frame while the client-side useEffect figured out the redirect.
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
    redirect(`/u/${username}`)
  }
  return <>{children}</>
}