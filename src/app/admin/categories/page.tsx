'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminToast } from '@/components/admin/ToastProvider'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
}

export default function AdminCategoriesPage() {
  const { show } = useAdminToast()
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const loadItems = async () => {
    const res = await window.fetch('/api/categories')
    const json = await res.json()
    setItems(json.data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const reset = () => { setName(''); setSlug(''); setDescription(''); setEditingId(null) }

  const handleSave = async () => {
    const body = { name, slug, description: description || null }
    if (editingId) {
      await window.fetch(`/api/categories/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    } else {
      await window.fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    }
    reset()
    show(editingId ? '分类已更新' : '分类已添加')
    loadItems()
  }

  const handleEdit = (item: Category) => {
    setEditingId(item.id); setName(item.name); setSlug(item.slug); setDescription(item.description || '')
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await window.fetch(`/api/categories/${deleteTarget}`, { method: 'DELETE' })
    setDeleteTarget(null)
    show('分类已删除')
    loadItems()
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">分类管理</h1>

      <Card className="admin-form-card">
        <CardContent>
          <div className="admin-form-row">
            <Input placeholder="名称" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <Input placeholder="描述（可选）" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button onClick={handleSave}>{editingId ? '更新' : '添加'}</Button>
            {editingId && <Button variant="outline" onClick={reset}>取消</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? <p className="admin-loading">加载中...</p> : items.length === 0 ? <p className="admin-empty">暂无分类</p> : (
            <table className="admin-table">
              <thead>
                <tr><th>名称</th><th>Slug</th><th>描述</th><th>排序</th><th>操作</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.slug}</td>
                    <td>{item.description || '-'}</td>
                    <td>{item.sortOrder}</td>
                    <td className="admin-actions">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>编辑</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(item.id)}>删除</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        title="确认删除"
        message="确定要删除这个分类吗？此操作不可撤销。"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
