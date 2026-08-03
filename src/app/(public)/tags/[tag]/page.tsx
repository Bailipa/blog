import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { readingMinutes } from '@/lib/readingTime'
import PostCard, { type PostCardPost } from '@/components/blog/PostCard'
import { FeaturedHero } from '@/components/blog/FeaturedHero'
import { splitFeaturedFirst } from '@/lib/groups'

export const dynamic = 'force-dynamic'

const POST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  featured: true,
  viewCount: true,
  publishedAt: true,
  content: true,
  category: { select: { name: true, slug: true } },
  tags: { select: { tag: { select: { name: true, slug: true } } } },
} as const

interface PageProps {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { tag: raw } = await params
  const slug = decodeURIComponent(raw)
  const tag = await prisma.tag.findUnique({ where: { slug } })
  if (!tag) return { title: '标签未找到' }
  return {
    title: `#${tag.name} - 标签`,
    description: `标签 #${tag.name} 下的所有文章`,
  }
}

export default async function TagPage({ params }: PageProps) {
  const { tag: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const tag = await prisma.tag.findUnique({ where: { slug } })
  if (!tag) notFound()

  const rawPosts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      tags: { some: { tagId: tag.id } },
    },
    orderBy: { publishedAt: 'desc' },
    select: POST_SELECT,
  })

  const posts: PostCardPost[] = rawPosts.map((p) => ({
    ...p,
    readingMinutes: readingMinutes(p.content),
  }))

  const { featured, rest } = splitFeaturedFirst(posts)

  const relatedTags = await prisma.tag.findMany({
    where: {
      posts: { some: { post: { status: 'PUBLISHED' } } },
      NOT: { id: tag.id },
    },
    include: {
      _count: { select: { posts: { where: { post: { status: 'PUBLISHED' } } } } },
    },
    orderBy: { posts: { _count: 'desc' } },
    take: 12,
  })

  return (
    <section className="group-page">
      <div className="group-page-header">
        <Link href="/blog" className="group-page-back">← 返回博客</Link>
        <div className="group-page-title-wrap">
          <span className="group-page-eyebrow">标签</span>
          <h1 className="group-page-title">
            <span className="tag-hash">#</span>{tag.name}
          </h1>
          <p className="group-page-count">
            共 <strong>{posts.length}</strong> 篇文章
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="group-page-empty">该标签暂无文章</p>
      ) : (
        <>
          {featured && (
            <div className="tag-featured-hero">
              <FeaturedHero post={featured} />
            </div>
          )}
          {rest.length > 0 && (
            <div className="group-page-grid">
              {rest.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </>
      )}

      {relatedTags.length > 0 && (
        <div className="related-tags">
          <h2 className="related-tags-title">其他标签</h2>
          <div className="related-tags-list">
            {relatedTags.map((t) => (
              <Link key={t.id} href={`/tags/${encodeURIComponent(t.slug)}`} className="related-tag">
                <span className="related-tag-name">#{t.name}</span>
                <span className="related-tag-count">{t._count.posts}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}