import Link from 'next/link'
import prisma from '@/lib/prisma'
import { readingMinutes } from '@/lib/readingTime'
import { groupPostsByYearMonth, formatYearMonth } from '@/lib/groups'
import PostCard, { type PostCardPost } from '@/components/blog/PostCard'
import { ArchiveTimeline } from '@/components/blog/ArchiveTimeline'

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

export const metadata = {
  title: '归档',
  description: '按时间浏览所有文章',
}

export default async function ArchivePage() {
  const rawPosts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: POST_SELECT,
  })

  const posts: PostCardPost[] = rawPosts.map((p) => ({
    ...p,
    readingMinutes: readingMinutes(p.content),
  }))
  const yearGroups = groupPostsByYearMonth(posts)
  const totalYears = yearGroups.length
  const totalMonths = yearGroups.reduce((s, y) => s + y.months.length, 0)

  return (
    <section className="archive-page">
      <div className="archive-header">
        <Link href="/blog" className="group-page-back">← 返回博客</Link>
        <span className="group-page-eyebrow">时间线</span>
        <h1 className="archive-title">归档</h1>
        <p className="archive-summary">
          共 <strong>{posts.length}</strong> 篇文章 · 跨越 <strong>{totalYears}</strong> 年 · <strong>{totalMonths}</strong> 个月份
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="group-page-empty">暂无已发布文章</p>
      ) : (
        <div className="archive-layout">
          <ArchiveTimeline years={yearGroups} />
          <div className="archive-content">
            {yearGroups.map((yg) => (
              <div key={yg.year} className="archive-year" id={`year-${yg.year}`}>
                <header className="archive-year-header">
                  <span className="archive-year-num">{yg.year}</span>
                  <span className="archive-year-count">{yg.total} 篇</span>
                  <span className="archive-year-rule" aria-hidden="true" />
                </header>
                {yg.months.map((mg) => (
                  <div key={`${yg.year}-${mg.month}`} id={`ym-${yg.year}-${mg.month}`} className="archive-month">
                    <h3 className="archive-month-title">{formatYearMonth(yg.year, mg.month)}</h3>
                    <div className="archive-month-grid">
                      {mg.posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}