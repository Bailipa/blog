'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface CommentRow {
  id: string
  content: string
  createdAt: string
}

interface CommentsProps {
  postSlug: string
}

const TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
}

export default function Comments({ postSlug }: CommentsProps) {
  const [items, setItems] = useState<CommentRow[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/comments?postSlug=${encodeURIComponent(postSlug)}`)
      const json = await res.json()
      if (res.ok) setItems(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [postSlug])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const trimmed = content.trim()
    if (!trimmed) {
      setError('评论内容不能为空')
      return
    }
    if (trimmed.length > 2000) {
      setError('评论内容过长（上限 2000 字符）')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postSlug, content: trimmed }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setSuccess('已提交')
        setContent('')
        await load()
      } else {
        setError(json.error || '提交失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="blog-comments">
      <header className="blog-comments-header">
        <h2 className="blog-comments-title">评论</h2>
        <p className="blog-comments-notice">
          本评论区为<strong>限时体验功能</strong>，随时可能调整或下线。完全匿名，仅记录必要信息。
        </p>
      </header>

      <form className="blog-comments-form" onSubmit={submit}>
        <textarea
          className="blog-comments-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="说点什么…"
          rows={4}
          maxLength={2000}
          disabled={submitting}
        />
        <div className="blog-comments-form-meta">
          <span className="blog-comments-counter">{content.length} / 2000</span>
          <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
            {submitting ? '提交中…' : '提交评论'}
          </Button>
        </div>
        {error && <p className="blog-comments-error">{error}</p>}
        {success && <p className="blog-comments-success">{success}</p>}
      </form>

      <ul className="blog-comments-list">
        {loading ? (
          <li className="blog-comments-empty">加载中…</li>
        ) : items.length === 0 ? (
          <li className="blog-comments-empty">还没有评论，来抢沙发？</li>
        ) : (
          items.map((c) => (
            <li key={c.id} className="blog-comments-item">
              <div className="blog-comments-item-meta">
                <time dateTime={c.createdAt}>
                  {new Date(c.createdAt).toLocaleString('zh-CN', TIMESTAMP_OPTIONS)}
                </time>
              </div>
              <p className="blog-comments-item-content">{c.content}</p>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}