'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAdminToast } from '@/components/admin/ToastProvider'

interface Post {
  id: string
  title: string
  slug: string
  status: string
  publishedAt: string | null
  category: { name: string } | null
}

export default function AdminPostsPage() {
  const { show } = useAdminToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()

  const loadPosts = async () => {
    setLoading(true)
    const res = await window.fetch('/api/posts?pageSize=200')
    const json = await res.json()
    setPosts(json.data || [])
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return posts
    const q = search.toLowerCase()
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q),
    )
  }, [posts, search])

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这篇文章？')) return
    const res = await window.fetch(`/api/posts/${id}`, { method: 'DELETE' })
    if (res.ok) { show('文章已删除'); loadPosts() }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">文章管理</h1>
        <Button onClick={() => router.push('/admin/posts/new')}>写新文章</Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索文章标题、slug、分类..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <p className="admin-loading">加载中...</p>
          ) : filtered.length === 0 ? (
            <p className="admin-empty">{search ? '没有匹配的文章' : '暂无文章'}</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>分类</th>
                  <th>状态</th>
                  <th>发布时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr key={post.id}>
                    <td className="admin-post-title">{post.title}</td>
                    <td>{post.category?.name || '-'}</td>
                    <td>
                      <span className={`admin-status admin-status-${post.status.toLowerCase()}`}>
                        {post.status === 'PUBLISHED' ? '已发布' : post.status === 'DRAFT' ? '草稿' : '已归档'}
                      </span>
                    </td>
                    <td>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('zh-CN') : '-'}</td>
                    <td className="admin-actions">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/admin/posts/${post.id}/edit`)}>编辑</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(post.id)}>删除</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
