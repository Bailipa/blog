interface PostHeaderProps {
  title: string
  excerpt?: string | null
  date: string
  readTime: number
  category?: { name: string; slug: string } | null
  tags: { tag: { name: string } }[]
  coverImage?: string | null
}

export function PostHeader({ title, excerpt, date, readTime, category, tags, coverImage }: PostHeaderProps) {
  return (
    <header className="post-header">
      {coverImage && (
        <img src={coverImage} alt={title} className="post-cover" loading="lazy" />
      )}
      <div className="post-meta-row">
        {category && <span className="post-cat-pill">{category.name}</span>}
        {date && <time className="post-date-text">{date}</time>}
        <span className="post-read-time">{readTime} 分钟阅读</span>
      </div>
      <h1 className="post-title-text">{title}</h1>
      {excerpt && <p className="post-excerpt-text">{excerpt}</p>}
      {tags.length > 0 && (
        <div className="post-tag-row">
          {tags.map(({ tag }) => (
            <span key={tag.name} className="post-tag-chip">{tag.name}</span>
          ))}
        </div>
      )}
    </header>
  )
}
