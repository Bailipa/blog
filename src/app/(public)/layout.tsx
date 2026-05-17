import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SectionReveal } from '@/components/layout/SectionReveal'
import { ArticleOverlay } from '@/components/layout/ArticleOverlay'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SectionReveal />
      <ArticleOverlay />
      <Header />
      {children}
      <Footer />
    </>
  )
}
