import Link from 'next/link'

interface PostCardProps {
  post: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    publishedAt: Date | null
    category: { name: string } | null
    tags: { tag: { name: string } }[]
  }
}

export default function PostCard({ post }: PostCardProps) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="post-card glass-card">
        <div className="post-card-top">
          {post.category && <span className="post-tag">{post.category.name}</span>}
          {date && <span className="post-date">{date}</span>}
        </div>
        <h3 className="post-card-title">{post.title}</h3>
        <p className="post-card-excerpt">{post.excerpt}</p>
        {post.tags.length > 0 && (
          <div className="post-card-tags">
            {post.tags.map(({ tag }) => (
              <span key={tag.name} className="post-card-tag">{tag.name}</span>
            ))}
          </div>
        )}
      </article>
    </Link>
  )
}
