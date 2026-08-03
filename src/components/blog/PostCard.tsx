'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder'

export interface PostCardPost {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  publishedAt?: Date | string | null
  coverImage?: string | null
  featured?: boolean
  viewCount?: number
  readingMinutes?: number
  category?: { name: string; slug?: string } | null
  tags?: { tag: { name: string; slug?: string } }[]
}

interface PostCardProps {
  post: PostCardPost
  size?: 'default' | 'compact'
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function PostCard({ post, size = 'default' }: PostCardProps) {
  const router = useRouter()
  const compact = size === 'compact'
  const tags = post.tags ?? []
  const featured = post.featured ?? false
  const viewCount = post.viewCount ?? 0
  const readingMinutes = post.readingMinutes ?? 1
  const excerpt = post.excerpt ?? null
  const category = post.category ?? null

  const detailHref = `/blog/${post.slug}`

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented) return
    const target = e.target as HTMLElement
    if (target.closest('a, button')) return
    router.push(detailHref)
  }

  const handleCardKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    if ((e.target as HTMLElement).closest('a, button')) return
    e.preventDefault()
    router.push(detailHref)
  }

  return (
    <article
      className={`post-card glass-card${featured ? ' post-card--featured' : ''}${compact ? ' post-card--compact' : ''}`}
      data-category={category?.slug || ''}
      data-slug={post.slug}
      role="link"
      tabIndex={0}
      aria-label={`阅读文章：${post.title}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKey}
    >
      <div className="post-card-cover" aria-hidden="true">
        <CoverPlaceholder seed={post.id} />
      </div>

      <div className="post-card-body">
        {featured && <span className="post-card-badge">精选</span>}
        <div className="post-card-top">
          {category ? (
            <Link
              href={`/categories/${category.slug}`}
              className="post-card-cat"
              onClick={(e) => e.stopPropagation()}
              title={`查看「${category.name}」分类下所有文章`}
            >
              {category.name}
            </Link>
          ) : (
            <span className="post-card-cat post-card-cat--empty">未分类</span>
          )}
        </div>

        <h3 className="post-card-title">
          <Link href={detailHref} className="post-card-title-link" onClick={(e) => e.stopPropagation()}>
            {post.title}
          </Link>
        </h3>

        {excerpt && <p className="post-card-excerpt">{excerpt}</p>}

        {tags.length > 0 && (
          <div className="post-card-tags">
            {tags.slice(0, 3).map(({ tag }) => (
              <Link
                key={tag.slug ?? tag.name}
                href={`/tags/${encodeURIComponent(tag.slug ?? tag.name)}`}
                className="post-card-tag"
                onClick={(e) => e.stopPropagation()}
                title={`查看 #${tag.name} 标签下所有文章`}
              >
                #{tag.name}
              </Link>
            ))}
            {tags.length > 3 && <span className="post-card-tag-more">+{tags.length - 3}</span>}
          </div>
        )}

        <div className="post-card-meta">
          <span className="post-card-meta-date">{formatDate(post.publishedAt)}</span>
          <span className="post-card-meta-sep" aria-hidden>·</span>
          <span className="post-card-meta-read">约 {readingMinutes} 分钟阅读</span>
          {viewCount > 0 && (
            <>
              <span className="post-card-meta-sep" aria-hidden>·</span>
              <span className="post-card-meta-views">{viewCount} 阅读</span>
            </>
          )}
        </div>
      </div>
    </article>
  )
}