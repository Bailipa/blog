import Link from 'next/link'
import PostCard, { type PostCardPost } from '@/components/blog/PostCard'
import { FeaturedHero } from '@/components/blog/FeaturedHero'
import { splitFeaturedFirst } from '@/lib/groups'

interface CategoryRef {
  id: string
  name: string
  slug: string
  description: string | null
}

interface Props {
  category: CategoryRef
  posts: PostCardPost[]
  maxFeatured?: number
  maxRail?: number
  id: string
  showViewAll?: boolean
}

export function CategorySection({ category, posts, maxFeatured = 1, maxRail = 8, id, showViewAll = true }: Props) {
  if (posts.length === 0) return null

  const { featured, rest } = splitFeaturedFirst(posts)
  const hero = featured ? [featured].slice(0, maxFeatured) : []
  const rail = (rest.length > 0 ? rest : hero).slice(0, maxRail)

  return (
    <section className="category-section" id={id} aria-labelledby={`${id}-title`}>
      <header className="category-section-header">
        <div className="category-section-title-wrap">
          <span className="category-section-eyebrow">分类</span>
          <h2 className="category-section-title" id={`${id}-title`}>{category.name}</h2>
          {category.description && <p className="category-section-desc">{category.description}</p>}
        </div>
        {showViewAll && (
          <Link href={`/categories/${category.slug}`} className="category-section-viewall">
            查看全部
            <span aria-hidden>→</span>
          </Link>
        )}
      </header>

      {hero.length > 0 && (
        <div className="category-section-hero">
          <FeaturedHero post={hero[0]} />
        </div>
      )}

      {rail.length > 0 && (
        <div className="category-section-rail" role="list">
          {rail.map((post) => (
            <div role="listitem" key={post.id} className="category-section-rail-item">
              <PostCard post={post} size="compact" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}