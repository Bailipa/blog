'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MDEditor from '@uiw/react-md-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdminToast } from '@/components/admin/ToastProvider'
import { generateSlug } from '@/lib/slug'

interface PostEditorProps {
  initialData?: {
    id?: string
    title: string
    slug: string
    content: string
    excerpt: string
    categoryId: string
    tagIds: string[]
    status: string
  }
}

export default function PostEditor({ initialData }: PostEditorProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '')
  const [status, setStatus] = useState(initialData?.status || 'DRAFT')
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '')
  const [tagIds, setTagIds] = useState<string[]>(initialData?.tagIds || [])
  const { show } = useAdminToast()
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasChanges =
    title !== (initialData?.title || '') ||
    slug !== (initialData?.slug || '') ||
    content !== (initialData?.content || '') ||
    excerpt !== (initialData?.excerpt || '') ||
    status !== (initialData?.status || 'DRAFT') ||
    categoryId !== (initialData?.categoryId || '') ||
    JSON.stringify(tagIds) !== JSON.stringify(initialData?.tagIds || [])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasChanges) return
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
    ]).then(([catJson, tagJson]) => {
      setCategories(catJson.data || [])
      setTags(tagJson.data || [])
    })
  }, [])

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) return null
      const json = await res.json()
      return json.data?.url || null
    } finally {
      setUploading(false)
    }
  }, [])

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        const url = await uploadImage(file)
        if (url) {
          setContent((prev) => prev + `\n![图片](${url})\n`)
          show('图片已上传')
        } else {
          show('图片上传失败', 'error')
        }
      }
    }
  }, [uploadImage, show])

  const handleToolbarUpload = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const url = await uploadImage(file)
      if (url) {
        setContent((prev) => prev + `\n![图片](${url})\n`)
        show('图片已上传')
      } else {
        show('图片上传失败', 'error')
      }
    }
    input.click()
  }, [uploadImage, show])

  const handleSave = async (publish: boolean) => {
    setSaving(true)
    setError('')
    const finalStatus = publish ? 'PUBLISHED' : status

    const body = {
      title,
      slug,
      content,
      excerpt,
      categoryId: categoryId || null,
      tagIds,
      status: finalStatus,
    }

    const url = isEdit ? `/api/posts/${initialData.id}` : '/api/posts'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      show(isEdit ? '文章已更新' : '文章已创建')
      router.push('/admin/posts')
    } else {
      const json = await res.json()
      setError(json.error || '保存失败')
      setSaving(false)
    }
  }

  const toggleTag = (id: string) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  return (
    <div className="admin-editor" ref={containerRef}>
      <div className="admin-editor-main">
        <div className="admin-editor-field">
          <Label htmlFor="title">标题</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="文章标题" />
        </div>

        <div className="admin-editor-field">
          <Label htmlFor="slug">Slug</Label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="留空将自动生成"
              style={{ flex: 1 }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSlug(generateSlug())}
              disabled={saving}
              title="生成随机 slug"
            >
              🎲 生成
            </Button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            URL 路径段，仅含小写字母、数字、连字符。留空则保存时自动生成。
          </p>
        </div>

        <div className="admin-editor-field">
          <Label htmlFor="excerpt">摘要</Label>
          <Input id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="文章摘要（可选）" />
        </div>

        <div className="admin-editor-field" data-color-mode="dark" onPaste={handlePaste}>
          <Label>内容 (Markdown) {uploading && <span style={{ color: 'var(--gold-bright)', fontSize: '0.8rem' }}>正在上传图片...</span>}</Label>
          <MDEditor
            value={content}
            onChange={(v) => setContent(v || '')}
            height={500}
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button type="button" variant="outline" size="sm" onClick={handleToolbarUpload} disabled={uploading}>
              {uploading ? '上传中...' : '插入图片'}
            </Button>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>或 Ctrl+V 粘贴图片</span>
          </div>
        </div>
      </div>

      <aside className="admin-editor-sidebar">
        <Card>
          <CardContent className="admin-editor-sidebar-content">
            <div className="admin-editor-field">
              <Label>状态</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">草稿</SelectItem>
                  <SelectItem value="PUBLISHED">已发布</SelectItem>
                  <SelectItem value="ARCHIVED">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="admin-editor-field">
              <Label>分类</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="admin-editor-field">
              <Label>标签</Label>
              <div className="admin-editor-tags">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`admin-editor-tag${tagIds.includes(t.id) ? ' selected' : ''}`}
                    onClick={() => toggleTag(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="admin-editor-error">{error}</p>}

            <div className="admin-editor-actions">
              <Button onClick={() => handleSave(false)} disabled={saving}>
                {saving ? '保存中...' : '保存草稿'}
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving} variant="default">
                {saving ? '发布中...' : '发布'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
