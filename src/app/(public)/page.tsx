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
    text: m.content,
    date: m.createdAt.toLocaleDateString('zh-CN'),
  }))

  return (
    <>
      <HomeInteractions />
      <CosmicHero />

      <section className="snap-page posts-page" id="posts">
        <h2 className="section-title">最新文章</h2>
        <div className="filter-bar">
          <span className="filter-tag active" data-filter="all">全部</span>
          {categories.map((cat) => (
            <span key={cat.slug} className="filter-tag" data-filter={cat.slug}>
              {cat.name}
            </span>
          ))}
        </div>
        <div className="posts-rows">
          <div className="posts-scroll">
            <div className="posts-track" id="postsTrack">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {posts.map((post) => (
                <PostCard key={`clone-${post.id}`} post={post} />
              ))}
            </div>
          </div>

          <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'inline-block' }}>碎碎念</h2>
          <div className="mumbles-scroll">
            <div className="mumbles-track">
              {mumbles.map((m, i) => (
                <div key={i} className="mumble-card">
                  <p>{m.text}</p>
                  <div className="mumble-meta">{m.date}</div>
                </div>
              ))}
              {mumbles.map((m, i) => (
                <div key={`clone-${i}`} className="mumble-card">
                  <p>{m.text}</p>
                  <div className="mumble-meta">{m.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="snap-page projects-section" id="projects">
        <h2 className="section-title">精选作品</h2>
        <ProjectGrid projects={projects} />
      </section>
    </>
  )
}
