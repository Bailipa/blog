'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

// Lightweight wrapper that gives client components access to useSession().
// Server components should use `auth()` from @/lib/auth directly.
export function AuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession?: Session | null
}) {
  return (
    <SessionProvider session={initialSession ?? null} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  )
}