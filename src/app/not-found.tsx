import Link from 'next/link'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function NotFound() {
  // Suggest a few recent posts so the user has somewhere to go.
  const recent = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: { slug: true, title: true },
  })

  return (
    <section className="notfound-page">
      <div className="notfound-inner">
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">页面未找到</h1>
        <p className="notfound-desc">
          你寻找的页面可能已被移除、改名，或者只是一次手滑。
        </p>
        <div className="notfound-actions">
          <Link href="/" className="notfound-btn-primary">返回首页</Link>
          <Link href="/blog" className="notfound-btn-secondary">浏览博客</Link>
        </div>
        {recent.length > 0 && (
          <div className="notfound-suggest">
            <p className="notfound-suggest-label">或者看这些：</p>
            <ul className="notfound-suggest-list">
              {recent.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
