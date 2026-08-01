import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

declare module 'next-auth' {
  interface User {
    isAdmin?: boolean
    username?: string | null
  }
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      username?: string | null
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

// Admin logs in with username + password at /admin/login. Visitors use
// the OTP flow at /login (handled by /api/auth/public/verify-code which
// directly issues a session JWT — no NextAuth signIn for visitors).
//
// Magic-link providers were removed because the visitor flow no longer
// sends a clickable link in email (OTP-only) and admins don't need
// email-based login.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.username || !credentials?.password) return null
        const { compare } = await import('bcryptjs')
        const prisma = (await import('./prisma')).default
        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        })
        if (!user || !user.password || user.deletedAt) return null
        const valid = await compare(credentials.password as string, user.password)
        if (!valid) return null
        return {
          id: user.id,
          name: user.name ?? user.username,
          username: user.username,
          email: user.email ?? undefined,
          isAdmin: user.isAdmin,
          // NextAuth maps `user.image` → `token.image` → `session.user.image`,
          // which is what Header.tsx reads for the avatar. Without this the
          // JWT would never carry the avatar URL, even on fresh sign-in.
          image: user.avatarUrl,
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        // Fresh sign-in: copy what we know about the user.
        ;(token as Record<string, unknown>).id = user.id
        ;(token as Record<string, unknown>).isAdmin = (user as { isAdmin: boolean }).isAdmin
        // Only set token.username if the user actually has one. Leave it
        // `undefined` otherwise — that's the signal below to refresh from
        // the DB on the next session call. We must NOT store `null`
        // unconditionally, otherwise we can't tell apart "real null, user
        // never onboarded" from "we never knew".
        const u = (user as { username?: string | null }).username
        if (u) {
          ;(token as Record<string, unknown>).username = u
        }
        // Display name (e.g. for Header dropdown); fall back to username.
        const n = (user as { name?: string | null }).name
        if (n) {
          ;(token as Record<string, unknown>).name = n
        }
        // Avatar URL (so Header can show uploaded avatar without a
        // /api/users/me round-trip).
        const a = (user as { image?: string | null }).image
        if (a) {
          ;(token as Record<string, unknown>).avatarUrl = a
        }
      } else if (trigger === 'update' && token.sub) {
        // Caller explicitly asked to refresh via useSession().update({...}).
        // Used after profile edit / avatar upload so the next render sees
        // the new username / name / avatar without waiting for the cookie
        // to expire.
        const prisma = (await import('./prisma')).default
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { username: true, name: true, avatarUrl: true },
        })
        if (fresh?.username) {
          ;(token as Record<string, unknown>).username = fresh.username
        }
        if (fresh?.name !== undefined) {
          ;(token as Record<string, unknown>).name = fresh.name
        }
        if (fresh?.avatarUrl !== undefined) {
          ;(token as Record<string, unknown>).avatarUrl = fresh.avatarUrl
        }
      } else if (
        (token as Record<string, unknown>).id &&
        (token as Record<string, unknown>).username === undefined
      ) {
        // Stale JWT from a previous deploy that didn't carry username.
        // Refresh once from the DB; subsequent calls will short-circuit
        // because token.username will be set.
        const prisma = (await import('./prisma')).default
        const id = (token as Record<string, unknown>).id as string
        const fresh = await prisma.user.findUnique({
          where: { id },
          select: { username: true, name: true, avatarUrl: true },
        })
        if (fresh?.username) {
          ;(token as Record<string, unknown>).username = fresh.username
        }
        if (fresh?.name) {
          ;(token as Record<string, unknown>).name = fresh.name
        }
        if (fresh?.avatarUrl) {
          ;(token as Record<string, unknown>).avatarUrl = fresh.avatarUrl
        }
      }
      return token
    },
    session: ({ session, token }) => {
      session.user.id = (token as Record<string, string>).id
      session.user.isAdmin = (token as Record<string, boolean>).isAdmin
      // null = onboarded false (intentional), undefined shouldn't reach here
      session.user.username = (token as Record<string, string | null | undefined>).username ?? null
      session.user.name = (token as Record<string, string | null | undefined>).name ?? null
      session.user.image = (token as Record<string, string | null | undefined>).avatarUrl ?? null
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: { strategy: 'jwt' },
})
