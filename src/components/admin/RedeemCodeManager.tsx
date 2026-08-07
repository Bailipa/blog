'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminToast } from '@/components/admin/ToastProvider'

interface RedeemCode {
  id: string
  code: string
  status: string
  redeemedAt: string | null
  redeemedBy: { username: string | null } | null
}

interface RedeemCodeManagerProps {
  postId?: string
}

export function RedeemCodeManager({ postId }: RedeemCodeManagerProps) {
  const { show } = useAdminToast()
  const [codes, setCodes] = useState<RedeemCode[]>([])
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!postId) return
    const res = await fetch(`/api/purchase/codes?postId=${postId}`)
    const json = await res.json()
    setCodes(json.data || [])
  }

  useEffect(() => {
    if (!postId) return
    let cancelled = false
    fetch(`/api/purchase/codes?postId=${postId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setCodes(json.data || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [postId])

  const handleGenerate = async () => {
    if (!postId) return
    setLoading(true)
    try {
      const res = await fetch('/api/purchase/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, count }),
      })
      const json = await res.json()
      if (res.ok) {
        show(`已生成 ${json.data.count} 个兑换码`)
        load()
      } else {
        show(json.error || '生成失败', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该兑换码？')) return
    await fetch(`/api/purchase/codes?id=${id}`, { method: 'DELETE' })
    show('已删除')
    load()
  }

  const unused = codes.filter((c) => c.status === 'UNUSED')
  const used = codes.filter((c) => c.status === 'USED')

  return (
    <div className="admin-editor-field">
      <Label>兑换码库存</Label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input
          type="number"
          min="1"
          max="500"
          value={count}
          onChange={(e) => setCount(Number(e.target.value) || 1)}
          style={{ width: 90 }}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={loading || !postId}>
          {loading ? '生成中…' : '生成兑换码'}
        </Button>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
        把下方未使用的兑换码粘贴到面包多的「卡密库存」，买家付款后自动发货。
      </p>
      {unused.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>未使用（{unused.length}）：</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {unused.map((c) => (
              <button
                key={c.id}
                type="button"
                title="点击复制，删除请右键确认"
                onClick={() => {
                  navigator.clipboard.writeText(c.code)
                  show(`已复制 ${c.code}`)
                }}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                }}
              >
                {c.code}
              </button>
            ))}
          </div>
        </div>
      )}
      {used.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>已使用（{used.length}）：</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {used.map((c) => (
              <span key={c.id} style={{ fontFamily: 'monospace', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <s>{c.code}</s>
                <span style={{ color: 'var(--text-dim)' }}>
                  {c.redeemedBy?.username || '已兑换'}
                </span>
                <Button type="button" variant="ghost" size="xs" onClick={() => handleDelete(c.id)}>
                  删除
                </Button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
