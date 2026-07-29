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

const allowPasswordLogin = process.env.ALLOW_PASSWORD_LOGIN === 'true'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'magic-link',
      name: 'magic-link',
      credentials: {
        token: { label: 'token', type: 'text' },
      },
      authorize: async (credentials) => {
        const token = credentials?.token
        if (typeof token !== 'string' || !token) return null
        const { consumeMagicToken } = await import('./magic-link')
        const result = await consumeMagicToken(token)
        if (!result.ok) return null
        const prisma = (await import('./prisma')).default
        const user = await prisma.user.findUnique({ where: { email: result.identifier } })
        if (!user || user.deletedAt) return null
        return {
          id: user.id,
          name: user.name ?? user.username,
          username: user.username,
          email: user.email ?? undefined,
          isAdmin: user.isAdmin,
        }
      },
    }),
    ...(allowPasswordLogin
      ? [
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
              }
            },
          }),
        ]
      : []),
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
      } else if (trigger === 'update' && token.sub) {
        // Caller explicitly asked to refresh via useSession().update({...}).
        // Used after profile edit so the next render sees the new username.
        const prisma = (await import('./prisma')).default
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { username: true },
        })
        if (fresh?.username) {
          ;(token as Record<string, unknown>).username = fresh.username
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
          select: { username: true },
        })
        if (fresh?.username) {
          ;(token as Record<string, unknown>).username = fresh.username
        }
      }
      return token
    },
    session: ({ session, token }) => {
      session.user.id = (token as Record<string, string>).id
      session.user.isAdmin = (token as Record<string, boolean>).isAdmin
      // null = onboarded false (intentional), undefined shouldn't reach here
      session.user.username = (token as Record<string, string | null | undefined>).username ?? null
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: { strategy: 'jwt' },
})
