import Link from 'next/link'

interface PostCardProps {
  post: {
    id: string; title: string; slug: string; excerpt: string | null
    publishedAt: Date | null; category: { name: string } | null
    tags: { tag: { name: string } }[]
  }
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="post-card glass-card">
        {post.category && <span className="post-tag">{post.category.name}</span>}
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <div className="post-meta">{post.publishedAt?.toISOString().split('T')[0]}</div>
      </article>
    </Link>
  )
}
