import CosmicHero from '@/components/hero/CosmicHero'
import PostCard, { type PostCardPost } from '@/components/blog/PostCard'
import ProjectGrid from '@/components/projects/ProjectGrid'
import { HomeInteractions } from '@/components/layout/HomeInteractions'
import { CategorySection } from '@/components/blog/CategorySection'
import { GlassPanel } from '@/components/ui/GlassPanel'
import prisma from '@/lib/prisma'
import { readingMinutes } from '@/lib/readingTime'
import { groupPostsByCategory } from '@/lib/groups'

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

export default async function HomePage() {
  const [rawPosts, projects, mumbleData, categories] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 60,
      select: POST_SELECT,
    }),
    prisma.project.findMany({
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    }),
    prisma.mumble.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  const posts: PostCardPost[] = rawPosts.map((p) => ({
    ...p,
    readingMinutes: readingMinutes(p.content),
  }))

  const mumbles = mumbleData.map((m) => ({
    id: m.id,
    text: m.content,
    date: m.createdAt.toLocaleDateString('zh-CN'),
  }))

  const categoryGroups = groupPostsByCategory(posts, categories, { maxPostsPerCategory: 9 })
  const categoryNavItems = categoryGroups.map((g) => ({
    slug: g.category.slug,
    name: g.category.name,
    count: g.posts.length,
  }))
  const uncategorized = posts.filter((p) => !p.category)

  return (
    <>
      <div id="top" />
      <HomeInteractions items={categoryNavItems} />
      <CosmicHero />

      <GlassPanel intensity="md">
        {categoryGroups.map((g) => (
          <CategorySection
            key={g.category.id}
            id={`section-${g.category.slug}`}
            category={g.category}
            posts={g.posts}
            maxRail={8}
          />
        ))}

        {uncategorized.length > 0 && (
          <section className="posts-section" id="section-uncategorized">
            <header className="section-header">
              <h2 className="section-title">未分类</h2>
            </header>
            <div className="posts-grid">
              {uncategorized.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

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
      </GlassPanel>
    </>
  )
}