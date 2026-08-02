import Link from 'next/link'

interface NavPost {
  slug: string
  title: string
}

interface PostNavigationProps {
  prev: NavPost | null
  next: NavPost | null
}

// Bottom-of-article prev/next nav. Labuladong pattern:
//   <nav class="grid grid-cols-2 max-lg:grid-cols-1">
// with a left cell for previous and right cell for next.
export function PostNavigation({ prev, next }: PostNavigationProps) {
  if (!prev && !next) return null
  return (
    <nav className="post-nav" aria-label="文章导航">
      {prev ? (
        <Link href={`/blog/${prev.slug}`} className="post-nav-cell post-nav-prev">
          <span className="post-nav-label">← 上一篇</span>
          <span className="post-nav-title">{prev.title}</span>
        </Link>
      ) : (
        <div className="post-nav-cell post-nav-empty" />
      )}
      {next ? (
        <Link href={`/blog/${next.slug}`} className="post-nav-cell post-nav-next">
          <span className="post-nav-label">下一篇 →</span>
          <span className="post-nav-title">{next.title}</span>
        </Link>
      ) : (
        <div className="post-nav-cell post-nav-empty" />
      )}
    </nav>
  )
}
