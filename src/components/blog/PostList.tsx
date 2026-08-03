'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import PostCard from '@/components/blog/PostCard'
import SearchInput from '@/components/blog/SearchInput'
import Fuse from 'fuse.js'

interface Post {
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

export default function BlogList({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState('')

  const fuse = useMemo(
    () => new Fuse(posts, {
      keys: ['title', 'excerpt'],
      threshold: 0.3,
    }),
    [posts],
  )

  const results = useMemo(() => {
    if (!query.trim()) return posts
    return fuse.search(query).map((r) => r.item)
  }, [fuse, query, posts])

  return (
    <section className="blog-list-page">
      <div className="blog-list-header">
        <h1 className="section-title">博客</h1>
        <p className="blog-list-count">共 {posts.length} 篇文章</p>
      </div>
      <div className="blog-list-search">
        <SearchInput value={query} onChange={setQuery} placeholder="搜索文章..." />
      </div>
      <div className="blog-list-grid">
        {results.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
      {results.length === 0 && (
        <p className="blog-list-empty">{posts.length === 0 ? '暂无文章' : '没有找到匹配的文章'}</p>
      )}
    </section>
  )
}
