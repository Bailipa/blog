import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SectionReveal } from '@/components/layout/SectionReveal'
import { ArticleOverlay } from '@/components/layout/ArticleOverlay'
import { AuthProvider } from '@/components/AuthProvider'
import { auth } from '@/lib/auth'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let socialLinks: { label: string; url: string }[] = []

  try {
    const config = await prisma.siteConfig.findUnique({ where: { key: 'social_links' } })
    if (config?.value) {
      const parsed = JSON.parse(config.value)
      if (Array.isArray(parsed)) socialLinks = parsed
    }
  } catch {}

  // Pass the server-side session down so the SessionProvider doesn't have
  // to make a refetch round-trip on first paint (avoids the "anonymous →
  // logged-in" flicker in the Header).
  const session = await auth()

  return (
    <AuthProvider initialSession={session}>
      <SectionReveal />
      <ArticleOverlay />
      <Header />
      {children}
      <Footer socialLinks={socialLinks} />
    </AuthProvider>
  )
}