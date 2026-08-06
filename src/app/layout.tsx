import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import { JsonLd } from '@/components/seo/JsonLd'
import CompassBg from '@/components/hero/CompassBg'
import { AuthProvider } from '@/components/AuthProvider'
import { auth } from '@/lib/auth'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: { default: "Lee's Blog", template: "%s | Lee's Blog" },
  description: "辉洋的博客 — 探索·创造·分享",
  keywords: ['博客', '技术', '编程', 'Next.js', 'TypeScript'],
  robots: { index: true, follow: true },
  alternates: {
    types: { 'application/rss+xml': `${baseUrl}/feed.xml` },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0806',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Session is needed by every route (Header dropdown, /u/[username] pages,
  // /onboarding, etc.) so we read it server-side once and pass it down via
  // SessionProvider. Without this, useSession() returns undefined in pages
  // that aren't nested under (public)/layout.tsx.
  const session = await auth()
  return (
    <html lang="zh-CN" className="antialiased" suppressHydrationWarning>
      <body>
        <CompassBg />
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          <AuthProvider initialSession={session}>
            {children}
            <JsonLd />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}