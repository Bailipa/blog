'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoginSuccess, type LoginSuccessUser } from '@/components/auth/LoginSuccess'

// Next.js needs this page to opt out of static prerender because
// useSearchParams() inside the child requires a runtime context.
// We wrap the form in <Suspense> as required by the framework when
// reading search params in a client component.
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 5 * 60 * 1000  // 5 minutes — comfortably covers the 15min magic-link TTL

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const search = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugLink, setDebugLink] = useState<string | null>(null)
  // When polling detects the session, swap the entire UI to the
  // shared <LoginSuccess> component. This gives the user the same
  // "✅ 登录成功" feedback whether they click the email link in this
  // tab or in any other tab.
  const [verifiedUser, setVerifiedUser] = useState<LoginSuccessUser | null>(null)

  const callbackUrl = search.get('callbackUrl') || '/'

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const reason = search.get('error')
    if (reason === 'token-invalid') setError('登录链接无效，请重新获取。')
    else if (reason === 'token-expired') setError('登录链接已过期（15 分钟），请重新获取。')
    else if (reason === 'missing-token') setError('链接无效。')
    else if (reason === 'signin-failed') setError('登录失败，请重试。')
    else if (reason === 'account-deleted') setError('该账号已被注销。')
    else if (reason === 'session-missing') setError('会话失效，请重新登录。')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [search])

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setDebugLink(null)
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setError('邮箱格式不正确')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/public/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, callbackUrl }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '发送失败')
        return
      }
      setSent(true)
      if (json.debugLink) setDebugLink(json.debugLink)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常')
    } finally {
      setLoading(false)
    }
  }

  // Once the email is sent, poll /api/users/me every 3s. When the user
  // clicks the link in the email (in this tab OR another tab — cookies
  // are shared), the session is set globally and our next poll detects it.
  // Then we swap to the <LoginSuccess> UI.
  //
  // Polling uses /api/users/me rather than /api/auth/session because the
  // former additionally tells us username/onboarded/avatarUrl etc., which
  // LoginSuccess needs.
  const pollStartedAt = useRef<number | null>(null)
  useEffect(() => {
    if (!sent) return
    if (verifiedUser) return
    pollStartedAt.current = Date.now()

    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      if (pollStartedAt.current && Date.now() - pollStartedAt.current > POLL_TIMEOUT_MS) {
        return  // give up after 5 min; the user can refresh to start over
      }
      try {
        const r = await fetch('/api/users/me', { cache: 'no-store' })
        if (cancelled) return
        if (r.ok) {
          const j = await r.json()
          const u = j?.user
          if (u?.id) {
            setVerifiedUser({
              username: u.username,
              name: u.name,
              email: u.email,
              avatarUrl: u.avatarUrl,
              isAdmin: u.isAdmin,
              onboarded: u.onboarded,
            })
            return
          }
        }
      } catch {
        // ignore; try again next tick
      }
      if (!cancelled) setTimeout(tick, POLL_INTERVAL_MS)
    }
    setTimeout(tick, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      pollStartedAt.current = null
    }
  }, [sent, verifiedUser])

  // Polling detected a session → render the shared success UI.
  if (verifiedUser) {
    return <LoginSuccess user={verifiedUser} callbackUrl={callbackUrl} />
  }

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-box">
          <h1 className="login-heading">登录链接已发送</h1>
          <p className="login-sub">
            请到 <strong className="login-email">{email}</strong> 查收邮件，
            点击里面的链接完成登录。链接 15 分钟内有效，仅可使用一次。
          </p>
          <p className="login-hint">
            首次登录会引导你设置用户名，之后可前往个人主页和发表评论。
          </p>
          <p className="login-hint" style={{ color: 'var(--gold-mid)' }}>
            <span className="login-poll-dot" aria-hidden /> 正在等待邮箱验证…
          </p>
          {debugLink && (
            <div className="login-dev-block">
              <strong>[DEV ONLY]</strong> 当前未配置邮件服务，请直接点击下方链接登录：
              <div style={{ marginTop: 8, wordBreak: 'break-all' }}>
                <a href={debugLink} className="login-dev-link">{debugLink}</a>
              </div>
            </div>
          )}
          <button
            type="button"
            className="login-btn"
            onClick={() => { setSent(false); setDebugLink(null); setEmail('') }}
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="login-heading">登录 / 注册</h1>
        <p className="login-sub">
          输入邮箱，我们会发送一个一次性登录链接。新邮箱会自动注册账号。
        </p>
        <form onSubmit={requestLink} className="login-form">
          <div className="login-field">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading || !email} className="login-btn">
            {loading ? '发送中…' : '发送登录链接'}
          </button>
        </form>
        <p className="login-footer-hint">
          管理员请到 <a href="/admin/login" className="login-link-inline">/admin/login</a>
        </p>
      </div>
    </div>
  )
}