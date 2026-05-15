import CosmicHero from '@/components/hero/CosmicHero'
import PostCard from '@/components/blog/PostCard'
import prisma from '@/lib/prisma'

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    include: { category: true, tags: { include: { tag: true } } },
  })

  return (
    <>
      <CosmicHero />
      <section className="snap-page posts-page" id="posts">
        <h2 className="section-title">最新文章</h2>
        <div className="posts-scroll">
          <div className="posts-track">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </div>
      </section>
    </>
  )
}
