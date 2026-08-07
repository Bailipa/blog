'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/paywall'

interface PaywallProps {
  postSlug: string
  postId: string
  priceCents: number | null
  mbdProductUrl?: string | null
}

export function Paywall({ postSlug, postId, priceCents, mbdProductUrl }: PaywallProps) {
  const { data: session, status } = useSession()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const isLoggedIn = status === 'authenticated'
  const userId = session?.user?.id

  const storeUrl = mbdProductUrl || undefined

  const handlePurchase = () => {
    if (!storeUrl) return
    const rand = Math.random().toString(36).slice(2, 10)
    const outOrderId = `${isLoggedIn ? userId : 'guest'}:${postId}:${rand}`
    const sep = storeUrl.includes('?') ? '&' : '?'
    window.open(`${storeUrl}${sep}out_order_id=${encodeURIComponent(outOrderId)}`, '_blank', 'noopener')
  }

  const handleRedeem = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/purchase/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, postSlug }),
      })
      const json = await res.json()
      if (res.ok && json.data?.unlocked) {
        setMessage({ type: 'ok', text: '兑换成功，页面即将刷新解锁全文…' })
        setTimeout(() => window.location.reload(), 800)
      } else {
        setMessage({ type: 'err', text: json.error || '兑换失败，请检查兑换码' })
      }
    } catch {
      setMessage({ type: 'err', text: '网络异常，请稍后重试' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="paywall">
      <div className="paywall-inner">
        <span className="paywall-badge">付费内容</span>
        <h2 className="paywall-title">这篇文章的剩余内容需要解锁</h2>
        <p className="paywall-desc">
          购买完成后，在面包多订单里获取兑换码（XXXX-XXXX-XXXX），回到本页输入兑换码即可解锁全文。
          {!isLoggedIn && ' 兑换前请先登录。'}
        </p>

        <div className="paywall-actions">
          {storeUrl ? (
            <Button asChild size="lg">
              <a href={storeUrl} onClick={handlePurchase} target="_blank" rel="noopener noreferrer">
                立即购买 · {formatPrice(priceCents)}
              </a>
            </Button>
          ) : (
            <Button size="lg" disabled>
              该文章暂未上架
            </Button>
          )}
        </div>

        <div className="paywall-redeem">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            aria-label="兑换码"
            className="paywall-input"
            maxLength={14}
          />
          <Button onClick={handleRedeem} disabled={loading || code.length < 11} variant="secondary">
            {loading ? '兑换中…' : '兑换'}
          </Button>
        </div>

        {message && (
          <p className={`paywall-msg ${message.type === 'ok' ? 'paywall-msg-ok' : 'paywall-msg-err'}`}>
            {message.text}
          </p>
        )}

        {!isLoggedIn && (
          <p className="paywall-login-hint">
            兑换需要登录：<Link href="/login">登录</Link> 后即可绑定已购文章
          </p>
        )}
      </div>
    </div>
  )
}
