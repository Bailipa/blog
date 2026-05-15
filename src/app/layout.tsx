import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: "Lee's Blog", template: "%s | Lee's Blog" },
  description: "辉洋的博客 — 探索·创造·分享",
  keywords: ['博客', '技术', '编程', 'Next.js', 'TypeScript'],
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0806',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="antialiased">
      <body>{children}</body>
    </html>
  )
}
