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
    jwt: ({ token, user, trigger }) => {
      if (user) {
        ;(token as Record<string, unknown>).id = user.id
        ;(token as Record<string, unknown>).isAdmin = (user as { isAdmin: boolean }).isAdmin
        ;(token as Record<string, unknown>).username = (user as { username?: string | null }).username ?? null
      }
      // On `update()` calls (e.g. after profile edit), refresh username from DB
      // so the session reflects the latest value.
      if (trigger === 'update' && token.sub) {
        // Best-effort: leave as-is unless caller passes new data via session()
      }
      return token
    },
    session: ({ session, token }) => {
      session.user.id = (token as Record<string, string>).id
      session.user.isAdmin = (token as Record<string, boolean>).isAdmin
      session.user.username = (token as Record<string, string | null>).username ?? null
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: { strategy: 'jwt' },
})
