import prisma from '@/lib/prisma'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SectionReveal } from '@/components/layout/SectionReveal'
import { ArticleOverlay } from '@/components/layout/ArticleOverlay'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let socialLinks: { label: string; url: string }[] = []

  try {
    const config = await prisma.siteConfig.findUnique({ where: { key: 'social_links' } })
    if (config?.value) {
      const parsed = JSON.parse(config.value)
      if (Array.isArray(parsed)) socialLinks = parsed
    }
  } catch {}

  return (
    <>
      <SectionReveal />
      <ArticleOverlay />
      <Header />
      {children}
      <Footer socialLinks={socialLinks} />
    </>
  )
}
