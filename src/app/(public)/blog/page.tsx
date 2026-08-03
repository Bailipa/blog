import Link from 'next/link'
import type { Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import PostCard, { type PostCardPost } from '@/components/blog/PostCard'
import { FeaturedHero } from '@/components/blog/FeaturedHero'
import { PostListItem } from '@/components/blog/PostListItem'
import { PostTimelineItem } from '@/components/blog/PostTimelineItem'
import { BlogFilterBar } from '@/components/blog/BlogFilterBar'
import { TagCloudSidebar } from '@/components/blog/TagCloudSidebar'
import { readingMinutes } from '@/lib/readingTime'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12

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

type SortKey = 'newest' | 'oldest' | 'popular' | 'featured'
type PeriodKey = 'all' | 'week' | 'month' | 'year'
type ViewKey = 'grid' | 'list' | 'timeline'

function sinceForPeriod(period: PeriodKey): Date | null {
  if (period === 'all') return null
  const d = new Date()
  if (period === 'week') d.setDate(d.getDate() - 7)
  else if (period === 'month') d.setMonth(d.getMonth() - 1)
  else if (period === 'year') d.setFullYear(d.getFullYear() - 1)
  return d
}

function orderByFor(sort: SortKey): Prisma.PostOrderByWithRelationInput[] {
  if (sort === 'oldest') return [{ publishedAt: 'asc' }]
  if (sort === 'popular') return [{ viewCount: 'desc' }, { publishedAt: 'desc' }]
  if (sort === 'featured') return [{ featured: 'desc' }, { publishedAt: 'desc' }]
  return [{ publishedAt: 'desc' }]
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    sort?: string
    category?: string
    period?: string
    q?: string
    view?: string
  }>
}

export default async function BlogPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const sort: SortKey = (['newest', 'oldest', 'popular', 'featured'].includes(sp.sort ?? '') as boolean)
    ? (sp.sort as SortKey)
    : 'newest'
  const period: PeriodKey = (['all', 'week', 'month', 'year'].includes(sp.period ?? '') as boolean)
    ? (sp.period as PeriodKey)
    : 'all'
  const view: ViewKey = (['grid', 'list', 'timeline'].includes(sp.view ?? '') as boolean)
    ? (sp.view as ViewKey)
    : 'grid'
  const categorySlug = sp.category && sp.category !== 'all' ? sp.category : null
  const q = (sp.q ?? '').trim()
  const currentPage = Math.max(1, Number(sp.page) || 1)
  const skip = (currentPage - 1) * PAGE_SIZE

  const where: Prisma.PostWhereInput = { status: 'PUBLISHED' }
  if (categorySlug) where.category = { slug: categorySlug }
  const since = sinceForPeriod(period)
  if (since) where.publishedAt = { gte: since }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { excerpt: { contains: q } },
    ]
  }

  const isDefaultFilter = sort === 'newest' && !categorySlug && period === 'all' && !q

  const [rawPosts, total, heroRow, allCategories, allTags] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: orderByFor(sort),
      skip,
      take: PAGE_SIZE,
      select: POST_SELECT,
    }),
    prisma.post.count({ where }),
    isDefaultFilter && currentPage === 1
      ? prisma.post.findFirst({
          where: { status: 'PUBLISHED', featured: true },
          orderBy: { publishedAt: 'desc' },
          select: POST_SELECT,
        })
      : Promise.resolve(null),
    prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
      },
    }),
    prisma.tag.findMany({
      where: { posts: { some: { post: { status: 'PUBLISHED' } } } },
      include: {
        _count: { select: { posts: { where: { post: { status: 'PUBLISHED' } } } } },
      },
    }),
  ])

  const posts: PostCardPost[] = rawPosts.map((p) => ({
    ...p,
    readingMinutes: readingMinutes(p.content),
  }))

  const heroPost = heroRow
    ? { ...heroRow, readingMinutes: readingMinutes(heroRow.content) }
    : null
  const heroId = heroPost?.id
  const listPosts = heroId ? posts.filter((p) => p.id !== heroId) : posts

  const categoryNavItems = allCategories
    .filter((c) => c._count.posts > 0)
    .map((c) => ({ slug: c.slug, name: c.name, count: c._count.posts }))

  const totalTagCount = await prisma.tag.count({
    where: { posts: { some: { post: { status: 'PUBLISHED' } } } },
  })
  const tagItems = allTags.map((t) => ({
    name: t.name,
    slug: t.slug,
    count: t._count.posts,
  }))
  const totalPostsAll = await prisma.post.count({ where: { status: 'PUBLISHED' } })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    if (sort !== 'newest') params.set('sort', sort)
    if (categorySlug) params.set('category', categorySlug)
    if (period !== 'all') params.set('period', period)
    if (view !== 'grid') params.set('view', view)
    if (q) params.set('q', q)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === '') params.delete(k)
      else params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `/blog?${qs}` : '/blog'
  }

  return (
    <div className="blog-layout">
      <main className="blog-list-main">
        <section className="blog-list-page">
          <div className="blog-list-header">
            <h1 className="section-title">博客</h1>
            <p className="blog-list-count">
              {q ? (
                <>搜索 <strong>「{q}」</strong> · 匹配 <strong>{total}</strong> 篇</>
              ) : (
                <>共 <strong>{total}</strong> 篇{isDefaultFilter ? '' : '匹配'}</>
              )}
            </p>
          </div>

          <BlogFilterBar
            categories={categoryNavItems}
            total={totalPostsAll}
            categoryCount={categoryNavItems.length}
            tagCount={totalTagCount}
          />

          {posts.length === 0 ? (
            <div className="blog-list-empty">
              <p className="blog-list-empty-title">没有找到匹配的文章</p>
              <p className="blog-list-empty-desc">
                试试调整筛选条件，或
                <Link href="/blog" className="blog-list-empty-link">查看全部文章</Link>
              </p>
            </div>
          ) : (
            <>
              {heroPost && view === 'grid' && (
                <div className="blog-list-featured">
                  <FeaturedHero post={heroPost} />
                </div>
              )}

              <div className={`blog-list-view blog-list-view--${view}`}>
                {view === 'grid' && (
                  <div className={`blog-list-grid ${heroPost ? 'blog-list-grid--with-hero' : ''}`}>
                    {listPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}

                {view === 'list' && (
                  <div className="blog-list-stream">
                    {listPosts.map((post) => (
                      <PostListItem key={post.id} post={post} />
                    ))}
                  </div>
                )}

                {view === 'timeline' && (
                  <div className="blog-list-timeline">
                    {listPosts.map((post, i) => (
                      <PostTimelineItem
                        key={post.id}
                        post={post}
                        showYear={i === 0 || new Date(listPosts[i - 1]?.publishedAt ?? 0).getFullYear() !== new Date(post.publishedAt ?? 0).getFullYear()}
                      />
                    ))}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <nav className="pagination">
                  {currentPage > 1 ? (
                    <Link href={buildHref({ page: String(currentPage - 1) })} className="pagination-link">上一页</Link>
                  ) : (
                    <span className="pagination-link is-disabled">上一页</span>
                  )}
                  <span className="pagination-current">{currentPage} / {totalPages}</span>
                  {currentPage < totalPages ? (
                    <Link href={buildHref({ page: String(currentPage + 1) })} className="pagination-link">下一页</Link>
                  ) : (
                    <span className="pagination-link is-disabled">下一页</span>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </main>

      <TagCloudSidebar
        tags={tagItems}
        categories={categoryNavItems}
        totalPosts={totalPostsAll}
        totalTags={totalTagCount}
      />
    </div>
  )
}