import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { markdownToHtml, extractToc, estimateReadTime } from '@/lib/markdown'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'
import TableOfContents from '@/components/blog/TableOfContents'
import { GiscusComments } from '@/components/comments/GiscusComments'

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

  return (
    <article className="blog-post-page">
      <Link href="/" className="blog-post-back">← 返回首页</Link>
      {post.coverImage && (
        <img src={post.coverImage} alt={post.title} className="blog-post-cover" loading="lazy" />
      )}
      <header className="blog-post-header">
        <div className="blog-post-meta">
          {post.category && <span className="post-tag">{post.category.name}</span>}
          {date && <time>{date}</time>}
          <span>{readTime} 分钟阅读</span>
        </div>
        <h1 className="blog-post-title">{post.title}</h1>
        {post.excerpt && <p className="blog-post-excerpt">{post.excerpt}</p>}
        {post.tags.length > 0 && (
          <div className="post-card-tags">
            {post.tags.map(({ tag }) => (
              <span key={tag.name} className="post-card-tag">{tag.name}</span>
            ))}
          </div>
        )}
      </header>

      <div className="blog-post-layout">
        {toc.length > 0 && (
          <aside className="blog-post-toc">
            <TableOfContents entries={toc} />
          </aside>
        )}
        <div className="blog-post-content">
          <MarkdownRenderer html={html} />
        </div>
      </div>

      <footer className="blog-post-comments">
        <GiscusComments slug={slug} />
      </footer>
    </article>
  )
}
