import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import { JsonLd } from '@/components/seo/JsonLd'
import { SpotlightTracker } from '@/components/layout/SpotlightTracker'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="antialiased" suppressHydrationWarning>
      <body>
        <SpotlightTracker />
        <div className="page-spotlight" id="pageSpotlight" />
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          {children}
          <JsonLd />
        </ThemeProvider>
      </body>
    </html>
  )
}
