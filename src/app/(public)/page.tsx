import CosmicHero from '@/components/hero/CosmicHero'
import PostCard from '@/components/blog/PostCard'
import ProjectGrid from '@/components/projects/ProjectGrid'
import { HomeInteractions } from '@/components/layout/HomeInteractions'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 8,
    include: { category: true, tags: { include: { tag: true } } },
  })

  const projects = await prisma.project.findMany({
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
  })

  const [mumbleData, categories] = await Promise.all([
    prisma.mumble.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  const mumbles = mumbleData.map((m) => ({
    id: m.id,
    text: m.content,
    date: m.createdAt.toLocaleDateString('zh-CN'),
  }))

  return (
    <>
      <HomeInteractions />
      <CosmicHero />

      <section className="posts-section">
        <header className="section-header">
          <h2 className="section-title">最新文章</h2>
          <div className="filter-bar">
            <span className="filter-tag active" data-filter="all">全部</span>
            {categories.map((cat) => (
              <span key={cat.slug} className="filter-tag" data-filter={cat.slug}>
                {cat.name}
              </span>
            ))}
          </div>
        </header>
        <div className="posts-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      {mumbles.length > 0 && (
        <section className="mumbles-section">
          <header className="section-header">
            <h2 className="section-title">碎碎念</h2>
            <p className="section-sub">日常随想 · 见闻 · 短记</p>
          </header>
          <div className="mumbles-grid">
            {mumbles.map((m) => (
              <article key={m.id} className="mumble-card">
                <p className="mumble-text">{m.text}</p>
                <div className="mumble-meta">{m.date}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section className="projects-section">
          <header className="section-header">
            <h2 className="section-title">精选作品</h2>
          </header>
          <ProjectGrid projects={projects} />
        </section>
      )}
    </>
  )
}
