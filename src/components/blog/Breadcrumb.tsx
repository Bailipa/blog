import Link from 'next/link'

interface BreadcrumbProps {
  category?: { name: string; slug: string } | null
  title: string
}

export function Breadcrumb({ category, title }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="post-breadcrumb">
      <Link href="/">首页</Link>
      <span className="post-breadcrumb-sep">/</span>
      <Link href="/blog">博客</Link>
      {category && (
        <>
          <span className="post-breadcrumb-sep">/</span>
          <span className="post-breadcrumb-cat">{category.name}</span>
        </>
      )}
      <span className="post-breadcrumb-sep">/</span>
      <span className="post-breadcrumb-current">{title}</span>
    </nav>
  )
}
