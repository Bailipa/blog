'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminToast } from '@/components/admin/ToastProvider'

interface Tag {
  id: string
  name: string
  slug: string
}

export default function AdminTagsPage() {
  const { show } = useAdminToast()
  const [items, setItems] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const loadItems = async () => {
    const res = await window.fetch('/api/tags')
    const json = await res.json()
    setItems(json.data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const reset = () => { setName(''); setSlug(''); setEditingId(null) }

  const handleSave = async () => {
    const body = { name, slug }
    if (editingId) {
      await window.fetch(`/api/tags/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    } else {
      await window.fetch('/api/tags', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    }
    reset()
    show(editingId ? '标签已更新' : '标签已添加')
    loadItems()
  }

  const handleEdit = (item: Tag) => {
    setEditingId(item.id); setName(item.name); setSlug(item.slug)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await window.fetch(`/api/tags/${id}`, { method: 'DELETE' })
    show('标签已删除')
    loadItems()
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">标签管理</h1>

      <Card className="admin-form-card">
        <CardContent>
          <div className="admin-form-row">
            <Input placeholder="名称" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <Button onClick={handleSave}>{editingId ? '更新' : '添加'}</Button>
            {editingId && <Button variant="outline" onClick={reset}>取消</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? <p className="admin-loading">加载中...</p> : items.length === 0 ? <p className="admin-empty">暂无标签</p> : (
            <table className="admin-table">
              <thead>
                <tr><th>名称</th><th>Slug</th><th>操作</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.slug}</td>
                    <td className="admin-actions">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>编辑</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>删除</Button>
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
