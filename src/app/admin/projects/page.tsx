'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminToast } from '@/components/admin/ToastProvider'

interface Project {
  id: string
  name: string
  slug: string
  description: string
  url: string
  repoUrl: string | null
  techStack: string
  featured: boolean
  sortOrder: number
}

const emptyForm = {
  name: '', slug: '', description: '', url: '', repoUrl: '',
  techStack: '', featured: false, sortOrder: 0,
}

export default function AdminProjectsPage() {
  const { show } = useAdminToast()
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loadItems = async () => {
    const res = await window.fetch('/api/projects')
    const json = await res.json()
    setItems(json.data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const reset = () => { setForm(emptyForm); setEditingId(null); setShowForm(false) }

  const handleSave = async () => {
    const body = { ...form }
    if (editingId) {
      await window.fetch(`/api/projects/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    } else {
      await window.fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    }
    reset()
    show(editingId ? '作品已更新' : '作品已添加')
    loadItems()
  }

  const handleEdit = (item: Project) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description,
      url: item.url,
      repoUrl: item.repoUrl || '',
      techStack: item.techStack,
      featured: item.featured,
      sortOrder: item.sortOrder,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    await window.fetch(`/api/projects/${id}`, { method: 'DELETE' })
    show('作品已删除')
    loadItems()
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">作品管理</h1>
        <Button onClick={() => { reset(); setShowForm(true) }}>添加作品</Button>
      </div>

      {showForm && (
        <Card className="admin-form-card">
          <CardContent>
            <div className="admin-form-grid">
              <Input placeholder="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              <Input placeholder="描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="项目 URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              <Input placeholder="仓库 URL（可选）" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} />
              <Input placeholder="技术栈（逗号分隔）" value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} />
               <label className="admin-form-checkbox">
                <Checkbox checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v === true })} />
                精选
              </label>
              <Input type="number" placeholder="排序" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="admin-form-actions">
              <Button onClick={handleSave}>{editingId ? '更新' : '添加'}</Button>
              <Button variant="outline" onClick={reset}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {loading ? <p className="admin-loading">加载中...</p> : items.length === 0 ? <p className="admin-empty">暂无作品</p> : (
            <table className="admin-table">
              <thead>
                <tr><th>名称</th><th>描述</th><th>技术栈</th><th>精选</th><th>排序</th><th>操作</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.description}</td>
                    <td>{item.techStack}</td>
                    <td>{item.featured ? '⭐' : '-'}</td>
                    <td>{item.sortOrder}</td>
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
