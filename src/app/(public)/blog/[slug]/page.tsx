import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { extractToc, getPostHtml } from '@/lib/markdown'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'
import TableOfContents from '@/components/blog/TableOfContents'
import Comments from '@/components/comments/Comments'
import { Breadcrumb } from '@/components/blog/Breadcrumb'
import { PostHeader } from '@/components/blog/PostHeader'
import { PostNavigation } from '@/components/blog/PostNavigation'
import { CodeEnhancer } from '@/components/blog/CodeEnhancer'
import { ViewCounter } from '@/components/blog/ViewCounter'
import { ReadingProgress } from '@/components/blog/ReadingProgress'
import { ShareButtons } from '@/components/blog/ShareButtons'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, coverImage: true, publishedAt: true },
  })
  if (!post) return {}
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const canonical = `${baseUrl}/blog/${slug}`
  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      url: canonical,
      publishedTime: post.publishedAt?.toISOString(),
      images: post.coverImage
        ? [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }]
        : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const post = await prisma.post.findUnique({
    where: { slug },
    include: { category: true, tags: { include: { tag: true } } },
  })

  if (!post || post.status !== 'PUBLISHED') notFound()

  let html = ''
  let toc: { id: string; text: string; level: number }[] = []
  let readTime = 0
  try {
    html = await getPostHtml(post.content)
    toc = extractToc(post.content)
  } catch {
    html = '<p>文章内容解析失败</p>'
  }
  readTime = post.readingMinutes ?? 0

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt?.toISOString(),
    image: post.coverImage || undefined,
    author: { '@type': 'Person', name: '辉洋' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseUrl}/blog/${slug}` },
  }

  // Sibling posts for prev/next nav + related posts (same category) in one batch.
  let prev: { slug: string; title: string } | null = null
  let next: { slug: string; title: string } | null = null
  let related: { slug: string; title: string; readingMinutes: number | null }[] = []
  if (post.publishedAt) {
    const [prevRow, nextRow, relatedRows] = await Promise.all([
      prisma.post.findFirst({
        where: { status: 'PUBLISHED', publishedAt: { lt: post.publishedAt } },
        orderBy: { publishedAt: 'desc' },
        select: { slug: true, title: true },
      }),
      prisma.post.findFirst({
        where: { status: 'PUBLISHED', publishedAt: { gt: post.publishedAt } },
        orderBy: { publishedAt: 'asc' },
        select: { slug: true, title: true },
      }),
      post.categoryId
        ? prisma.post.findMany({
            where: { status: 'PUBLISHED', categoryId: post.categoryId, NOT: { id: post.id } },
            orderBy: { publishedAt: 'desc' },
            take: 3,
            select: { slug: true, title: true, readingMinutes: true },
          })
        : Promise.resolve([]),
    ])
    prev = prevRow
    next = nextRow
    related = relatedRows
  }

  return (
    <article className="article-page">
      <CodeEnhancer />
      <ViewCounter slug={slug} />
      <ReadingProgress />

      <div className="article-layout">
        <main className="article-main">
          <div className="article-content-wrap">
            <Breadcrumb category={post.category} title={post.title} />

            <PostHeader
              title={post.title}
              excerpt={post.excerpt}
              date={date}
              readTime={readTime}
              category={post.category}
              tags={post.tags}
              coverImage={post.coverImage}
            />

            <ShareButtons title={post.title} url={`${baseUrl}/blog/${slug}`} />

            <MarkdownRenderer html={html} />

            <PostNavigation prev={prev} next={next} />

            {related.length > 0 && (
              <section className="related-posts" aria-label="相关文章">
                <h2 className="related-posts-title">相关文章</h2>
                <ul className="related-posts-list">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/blog/${r.slug}`} className="related-post-link">
                        <span className="related-post-title">{r.title}</span>
                        {r.readingMinutes ? (
                          <span className="related-post-meta">约 {r.readingMinutes} 分钟</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <footer className="article-comments-wrap">
              <Comments postSlug={slug} />
            </footer>
          </div>
        </main>

        {toc.length > 0 && <TableOfContents entries={toc} />}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    </article>
  )
}
