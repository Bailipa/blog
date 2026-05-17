'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminToast } from '@/components/admin/ToastProvider'

interface Mumble {
  id: string
  content: string
  createdAt: string
}

export default function AdminMumblesPage() {
  const { show } = useAdminToast()
  const [items, setItems] = useState<Mumble[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const loadItems = async () => {
    const res = await window.fetch('/api/mumbles')
    const json = await res.json()
    setItems(json.data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const reset = () => { setContent(''); setEditingId(null) }

  const handleSave = async () => {
    if (!content.trim()) return
    if (editingId) {
      await window.fetch(`/api/mumbles/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
      })
    } else {
      await window.fetch('/api/mumbles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
      })
    }
    reset()
    show(editingId ? '碎碎念已更新' : '碎碎念已添加')
    loadItems()
  }

  const handleEdit = (item: Mumble) => {
    setEditingId(item.id); setContent(item.content)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await window.fetch(`/api/mumbles/${id}`, { method: 'DELETE' })
    show('碎碎念已删除')
    loadItems()
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">碎碎念管理</h1>
      <Card className="admin-form-card">
        <CardContent>
          <div className="admin-form-row" style={{ alignItems: 'stretch' }}>
            <Textarea
              placeholder="写点什么..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              style={{ flex: 1, minHeight: 80, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Button onClick={handleSave} disabled={!content.trim()}>{editingId ? '更新' : '添加'}</Button>
              {editingId && <Button variant="outline" onClick={reset}>取消</Button>}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          {loading ? <p className="admin-loading">加载中...</p> : items.length === 0 ? <p className="admin-empty">暂无碎碎念</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item) => (
                <div key={item.id} className="mumble-card" style={{ width: '100%', cursor: 'default' }}>
                  <p>{item.content}</p>
                  <div className="mumble-meta">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</div>
                  <div className="admin-actions" style={{ marginTop: 8 }}>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>编辑</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>删除</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
