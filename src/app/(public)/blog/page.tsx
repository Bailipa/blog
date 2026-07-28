import Link from 'next/link'
import prisma from '@/lib/prisma'
import PostCard from '@/components/blog/PostCard'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const currentPage = Math.max(1, Number(params.page) || 1)
  const skip = (currentPage - 1) * PAGE_SIZE

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { category: true, tags: { include: { tag: true } } },
    }),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <section className="blog-list-page">
      <div className="blog-list-header">
        <h1 className="section-title">博客</h1>
        <p className="blog-list-count">共 {total} 篇文章</p>
      </div>
      <div className="blog-list-grid">
        {posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          {currentPage > 1 && (
            <Link href={`/blog?page=${currentPage - 1}`} className="pagination-link">上一页</Link>
          )}
          <span className="pagination-current">{currentPage} / {totalPages}</span>
          {currentPage < totalPages && (
            <Link href={`/blog?page=${currentPage + 1}`} className="pagination-link">下一页</Link>
          )}
        </div>
      )}
    </section>
  )
}
