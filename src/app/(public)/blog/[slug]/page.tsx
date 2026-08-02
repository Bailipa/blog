import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { markdownToHtml, extractToc, estimateReadTime } from '@/lib/markdown'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'
import TableOfContents from '@/components/blog/TableOfContents'
import Comments from '@/components/comments/Comments'
import { Breadcrumb } from '@/components/blog/Breadcrumb'
import { PostHeader } from '@/components/blog/PostHeader'
import { PostNavigation } from '@/components/blog/PostNavigation'
import { CodeEnhancer } from '@/components/blog/CodeEnhancer'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.post.findUnique({ where: { slug }, select: { title: true, excerpt: true } })
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: { title: post.title, description: post.excerpt || undefined, type: 'article' },
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
    html = await markdownToHtml(post.content)
    toc = extractToc(post.content)
    readTime = estimateReadTime(post.content)
  } catch {
    html = '<p>文章内容解析失败</p>'
  }

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  // Sibling posts for prev/next nav (by publishedAt ordering)
  let prev: { slug: string; title: string } | null = null
  let next: { slug: string; title: string } | null = null
  if (post.publishedAt) {
    const [prevRow, nextRow] = await Promise.all([
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
    ])
    prev = prevRow
    next = nextRow
  }

  return (
    <article className="article-page">
      <CodeEnhancer />

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

            <MarkdownRenderer html={html} />

            <PostNavigation prev={prev} next={next} />

            <footer className="article-comments-wrap">
              <Comments postSlug={slug} />
            </footer>
          </div>
        </main>

        {toc.length > 0 && (
          <aside className="article-toc-aside">
            <TableOfContents entries={toc} />
          </aside>
        )}
      </div>
    </article>
  )
}
