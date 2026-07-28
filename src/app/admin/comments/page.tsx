'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminToast } from '@/components/admin/ToastProvider'

interface CommentRow {
  id: string
  content: string
  status: 'VISIBLE' | 'HIDDEN'
  createdAt: string
  postId: string
  ipHash: string | null
  post: { slug: string; title: string }
}

interface BreakerState {
  open: boolean
  reason: 'manual' | 'auto' | null
  trippedAt: string | null
}

type StatusFilter = 'ALL' | 'VISIBLE' | 'HIDDEN'

export default function AdminCommentsPage() {
  const { show } = useAdminToast()
  const [rows, setRows] = useState<CommentRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [breaker, setBreaker] = useState<BreakerState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ pageSize: '100' })
    if (filter !== 'ALL') params.set('status', filter)
    const res = await window.fetch(`/api/admin/comments?${params}`)
    const json = await res.json()
    if (res.ok) {
      setRows(json.data || [])
      setTotal(json.total || 0)
      setBreaker(json.breaker || null)
    } else {
      show(json.error || '加载失败', 'error')
    }
    setLoading(false)
  }, [filter, show])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: 'VISIBLE' | 'HIDDEN') => {
    setBusy(true)
    const res = await window.fetch(`/api/admin/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusy(false)
    if (res.ok) {
      show(status === 'HIDDEN' ? '已隐藏' : '已恢复显示')
      load()
    } else {
      const json = await res.json().catch(() => ({}))
      show(json.error || '操作失败', 'error')
    }
  }

  const toggleBreaker = async () => {
    if (!breaker) return
    setBusy(true)
    const next = !breaker.open
    const res = await window.fetch('/api/admin/comments/breaker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open: next }),
    })
    setBusy(false)
    if (res.ok) {
      show(next ? '已开启熔断：所有新评论自动隐藏' : '已关闭熔断')
      load()
    } else {
      const json = await res.json().catch(() => ({}))
      show(json.error || '操作失败', 'error')
    }
  }

  const bulkAction = async (status: 'VISIBLE' | 'HIDDEN') => {
    if (!confirm(status === 'HIDDEN' ? '一键隐藏所有可见评论？' : '一键恢复所有隐藏评论？')) return
    const targets = status === 'HIDDEN'
      ? rows.filter((r) => r.status === 'VISIBLE')
      : rows.filter((r) => r.status === 'HIDDEN')
    if (!targets.length) { show('当前页没有可操作的评论'); return }
    setBusy(true)
    const results = await Promise.all(targets.map((c) =>
      window.fetch(`/api/admin/comments/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    ))
    setBusy(false)
    const failed = results.filter((r) => !r.ok).length
    if (failed === 0) show(`已${status === 'HIDDEN' ? '隐藏' : '恢复'} ${targets.length} 条`)
    else show(`${targets.length - failed} 条成功，${failed} 条失败`, 'error')
    load()
  }

  const counts = useMemo(() => {
    const c = { VISIBLE: 0, HIDDEN: 0 }
    rows.forEach((r) => { c[r.status]++ })
    return c
  }, [rows])

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">评论管理</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <BreakerBadge breaker={breaker} onToggle={toggleBreaker} busy={busy} />
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardContent>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>状态</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as StatusFilter)}
                style={{ marginLeft: 8, padding: '4px 8px', background: 'var(--bg-elev)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                <option value="ALL">全部 ({total})</option>
                <option value="VISIBLE">显示中 ({counts.VISIBLE})</option>
                <option value="HIDDEN">已隐藏 ({counts.HIDDEN})</option>
              </select>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" onClick={() => bulkAction('HIDDEN')} disabled={busy || counts.VISIBLE === 0}>
                隐藏本页可见
              </Button>
              <Button variant="outline" size="sm" onClick={() => bulkAction('VISIBLE')} disabled={busy || counts.HIDDEN === 0}>
                恢复本页隐藏
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p style={{ color: 'var(--text-dim)' }}>加载中...</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>暂无评论</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((c) => (
            <Card key={c.id}>
              <CardContent>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4,
                        background: c.status === 'VISIBLE' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: c.status === 'VISIBLE' ? '#4ade80' : '#f87171',
                      }}>
                        {c.status === 'VISIBLE' ? '可见' : '已隐藏'}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                        {new Date(c.createdAt).toLocaleString('zh-CN')}
                      </span>
                      {c.ipHash && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          ip: {c.ipHash.slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <a
                      href={`/blog/${c.post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.85rem', color: 'var(--gold-mid)', textDecoration: 'none' }}
                    >
                      {c.post.title}
                    </a>
                    <p style={{
                      margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      color: 'var(--text)', fontSize: '0.95rem',
                    }}>
                      {c.content}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {c.status === 'VISIBLE' ? (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'HIDDEN')} disabled={busy}>
                        隐藏
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'VISIBLE')} disabled={busy}>
                        恢复
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function BreakerBadge({ breaker, onToggle, busy }: { breaker: BreakerState | null; onToggle: () => void; busy: boolean }) {
  if (!breaker) return null
  const open = breaker.open
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span
        title={breaker.trippedAt ? `触发时间: ${new Date(breaker.trippedAt).toLocaleString('zh-CN')}` : undefined}
        style={{
          fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6,
          background: open ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.15)',
          color: open ? '#fca5a5' : '#86efac',
        }}
      >
        熔断 {open ? `已开启${breaker.reason === 'auto' ? '（自动）' : '（手动）'}` : '正常'}
      </span>
      <Button size="sm" variant="outline" onClick={onToggle} disabled={busy}>
        {open ? '关闭熔断' : '开启熔断'}
      </Button>
    </div>
  )
}