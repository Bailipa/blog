import Link from 'next/link'
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder'
import type { PostCardPost } from './PostCard'

interface Props {
  post: PostCardPost
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function FeaturedHero({ post }: Props) {
  const category = post.category ?? null
  const tags = post.tags ?? []
  const readingMinutes = post.readingMinutes ?? 1
  const viewCount = post.viewCount ?? 0
  const excerpt = post.excerpt ?? ''

  return (
    <Link href={`/blog/${post.slug}`} className="featured-hero-link">
      <article className="featured-hero glass-card">
        <div className="featured-hero-cover">
          <CoverPlaceholder seed={post.id} className="featured-hero-cover-gradient" />
          <div className="featured-hero-overlay" aria-hidden="true" />
          <span className="featured-hero-badge">精选</span>
        </div>
        <div className="featured-hero-body">
          <div className="featured-hero-meta">
            {category && <span className="featured-hero-cat">{category.name}</span>}
            <span className="featured-hero-dot" aria-hidden>·</span>
            <span className="featured-hero-date">{formatDate(post.publishedAt)}</span>
            <span className="featured-hero-dot" aria-hidden>·</span>
            <span className="featured-hero-read">约 {readingMinutes} 分钟阅读</span>
          </div>
          <h2 className="featured-hero-title">{post.title}</h2>
          {excerpt && <p className="featured-hero-excerpt">{excerpt}</p>}
          <div className="featured-hero-footer">
            <div className="featured-hero-tags">
              {tags.slice(0, 4).map(({ tag }) => (
                <span key={tag.name} className="featured-hero-tag">{tag.name}</span>
              ))}
            </div>
            {viewCount > 0 && (
              <span className="featured-hero-views">{viewCount} 阅读</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}