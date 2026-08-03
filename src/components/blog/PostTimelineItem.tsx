'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PostCardPost } from './PostCard'
import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder'

interface Props {
  post: PostCardPost
  showYear?: boolean
}

function formatMonth(value: Date | string | null | undefined): { year: string; month: string; day: string } {
  if (!value) return { year: '', month: '', day: '' }
  const d = new Date(value)
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    day: String(d.getDate()).padStart(2, '0'),
  }
}

export function PostTimelineItem({ post, showYear = false }: Props) {
  const router = useRouter()
  const tags = post.tags ?? []
  const category = post.category ?? null
  const featured = post.featured ?? false
  const viewCount = post.viewCount ?? 0
  const readingMinutes = post.readingMinutes ?? 1
  const excerpt = post.excerpt ?? ''
  const date = formatMonth(post.publishedAt)
  const detailHref = `/blog/${post.slug}`

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented) return
    if ((e.target as HTMLElement).closest('a, button')) return
    router.push(detailHref)
  }

  return (
    <article
      className={`post-timeline-item${featured ? ' post-timeline-item--featured' : ''}`}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      aria-label={`阅读文章：${post.title}`}
    >
      <div className="post-timeline-dot" aria-hidden>
        {featured && <span className="post-timeline-dot-inner" />}
      </div>

      <div className="post-timeline-card glass-card">
        <div className="post-timeline-cover" aria-hidden="true">
          <CoverPlaceholder seed={post.id} />
        </div>

        <div className="post-timeline-body">
          <div className="post-timeline-meta-top">
            {category && (
              <Link
                href={`/categories/${category.slug}`}
                className="post-timeline-cat"
                onClick={(e) => e.stopPropagation()}
              >
                {category.name}
              </Link>
            )}
            {featured && <span className="post-timeline-badge">精选</span>}
            <span className="post-timeline-date">
              {showYear && <span className="post-timeline-date-year">{date.year}</span>}
              <span>{date.month}/{date.day}</span>
            </span>
            <span className="post-timeline-read">约 {readingMinutes} 分钟阅读</span>
            {viewCount > 0 && <span className="post-timeline-views">{viewCount} 阅读</span>}
          </div>

          <h3 className="post-timeline-title">
            <Link href={detailHref} onClick={(e) => e.stopPropagation()}>{post.title}</Link>
          </h3>

          {excerpt && <p className="post-timeline-excerpt">{excerpt}</p>}

          {tags.length > 0 && (
            <div className="post-timeline-tags">
              {tags.slice(0, 4).map(({ tag }) => (
                <Link
                  key={tag.slug ?? tag.name}
                  href={`/tags/${encodeURIComponent(tag.slug ?? tag.name)}`}
                  className="post-timeline-tag"
                  onClick={(e) => e.stopPropagation()}
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}