import Link from 'next/link'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { CategorySection } from '@/components/blog/CategorySection'
import { groupPostsByYearMonth, formatYearMonth } from '@/lib/groups'

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
  readingMinutes: true,
  category: { select: { name: true, slug: true } },
  tags: { select: { tag: { select: { name: true, slug: true } } } },
} as const

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const cat = await prisma.category.findUnique({ where: { slug } })
  if (!cat) return { title: '分类未找到' }
  return {
    title: `${cat.name} - 分类`,
    description: cat.description ?? `${cat.name} 分类下的所有文章`,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const category = await prisma.category.findUnique({ where: { slug } })
  if (!category) notFound()

  const rawPosts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', categoryId: category.id },
    orderBy: { publishedAt: 'desc' },
    select: POST_SELECT,
  })

  const posts = rawPosts.map((p) => ({
    ...p,
    readingMinutes: p.readingMinutes,
  }))
  const yearGroups = groupPostsByYearMonth(posts)

  return (
    <section className="group-page">
      <div className="group-page-header">
        <Link href="/blog" className="group-page-back">← 返回博客</Link>
        <div className="group-page-title-wrap">
          <span className="group-page-eyebrow">分类</span>
          <h1 className="group-page-title">{category.name}</h1>
          {category.description && <p className="group-page-desc">{category.description}</p>}
          <p className="group-page-count">
            共 <strong>{posts.length}</strong> 篇文章
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="group-page-empty">该分类暂无文章</p>
      ) : (
        <>
          <CategorySection
            category={category}
            posts={posts}
            id={`cat-${category.slug}`}
            showViewAll={false}
            maxRail={50}
          />

          {yearGroups.length > 1 && (
            <details className="group-page-toc">
              <summary>按时间浏览</summary>
              <ul className="group-page-toc-list">
                {yearGroups.map((yg) => (
                  <li key={yg.year}>
                    <span className="group-page-toc-year">{yg.year} 年 ({yg.total})</span>
                    <ul>
                      {yg.months.map((mg) => (
                        <li key={`${yg.year}-${mg.month}`}>
                          {formatYearMonth(yg.year, mg.month)} ({mg.posts.length})
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  )
}