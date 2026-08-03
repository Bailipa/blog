'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PostCardPost } from './PostCard'
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder'

interface Props {
  post: PostCardPost
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function PostListItem({ post }: Props) {
  const router = useRouter()
  const tags = post.tags ?? []
  const category = post.category ?? null
  const featured = post.featured ?? false
  const viewCount = post.viewCount ?? 0
  const readingMinutes = post.readingMinutes ?? 1
  const excerpt = post.excerpt ?? ''
  const detailHref = `/blog/${post.slug}`

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented) return
    if ((e.target as HTMLElement).closest('a, button')) return
    router.push(detailHref)
  }

  return (
    <article
      className={`post-list-item glass-card${featured ? ' post-list-item--featured' : ''}`}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      aria-label={`阅读文章：${post.title}`}
    >
      <div className="post-list-item-cover" aria-hidden="true">
        <CoverPlaceholder seed={post.id} />
        {featured && <span className="post-list-item-badge">精选</span>}
      </div>

      <div className="post-list-item-body">
        <div className="post-list-item-meta-top">
          {category && (
            <Link
              href={`/categories/${category.slug}`}
              className="post-list-item-cat"
              onClick={(e) => e.stopPropagation()}
            >
              {category.name}
            </Link>
          )}
          <span className="post-list-item-date">{formatDate(post.publishedAt)}</span>
          {viewCount > 0 && <span className="post-list-item-views">{viewCount} 阅读</span>}
        </div>

        <h3 className="post-list-item-title">
          <Link href={detailHref} onClick={(e) => e.stopPropagation()}>{post.title}</Link>
        </h3>

        {excerpt && <p className="post-list-item-excerpt">{excerpt}</p>}

        <div className="post-list-item-footer">
          <div className="post-list-item-tags">
            {tags.slice(0, 4).map(({ tag }) => (
              <Link
                key={tag.slug ?? tag.name}
                href={`/tags/${encodeURIComponent(tag.slug ?? tag.name)}`}
                className="post-list-item-tag"
                onClick={(e) => e.stopPropagation()}
              >
                #{tag.name}
              </Link>
            ))}
          </div>
          <span className="post-list-item-read">约 {readingMinutes} 分钟阅读</span>
        </div>
      </div>
    </article>
  )
}