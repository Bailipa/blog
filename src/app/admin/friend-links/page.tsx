'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminToast } from '@/components/admin/ToastProvider'

interface Link {
  id: string
  name: string
  url: string
  description: string | null
  sortOrder: number
}

export default function AdminFriendLinksPage() {
  const { show } = useAdminToast()
  const [items, setItems] = useState<Link[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', url: '', description: '', sortOrder: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)

  const loadItems = async () => {
    const res = await window.fetch('/api/friend-links')
    const json = await res.json()
    setItems(json.data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const reset = () => { setForm({ name: '', url: '', description: '', sortOrder: 0 }); setEditingId(null) }

  const handleSave = async () => {
    const body = { ...form, description: form.description || null }
    if (editingId) {
      await window.fetch(`/api/friend-links/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    } else {
      await window.fetch('/api/friend-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    }
    reset()
    show(editingId ? '友链已更新' : '友链已添加')
    loadItems()
  }

  const handleEdit = (item: Link) => {
    setEditingId(item.id)
    setForm({ name: item.name, url: item.url, description: item.description || '', sortOrder: item.sortOrder })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await window.fetch(`/api/friend-links/${id}`, { method: 'DELETE' })
    show('友链已删除')
    loadItems()
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">友链管理</h1>
      <Card className="admin-form-card">
        <CardContent>
          <div className="admin-form-row">
            <Input placeholder="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Input placeholder="描述（可选）" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input type="number" placeholder="排序" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            <Button onClick={handleSave}>{editingId ? '更新' : '添加'}</Button>
            {editingId && <Button variant="outline" onClick={reset}>取消</Button>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          {loading ? <p className="admin-loading">加载中...</p> : items.length === 0 ? <p className="admin-empty">暂无友链</p> : (
            <table className="admin-table">
              <thead><tr><th>名称</th><th>URL</th><th>描述</th><th>排序</th><th>操作</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td><td>{item.url}</td><td>{item.description || '-'}</td><td>{item.sortOrder}</td>
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
