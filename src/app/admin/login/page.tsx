'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugLink, setDebugLink] = useState<string | null>(null)
  const [allowPassword, setAllowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const reason = search.get('error')
    if (reason === 'token-invalid') setError('登录链接无效，请重新获取。')
    else if (reason === 'token-expired') setError('登录链接已过期（15 分钟），请重新获取。')
    else if (reason === 'missing-token') setError('链接无效。')
    else if (reason === 'signin-failed') setError('登录失败，请重试。')
    fetch('/api/auth/options')
      .then((r) => r.json())
      .then((j) => setAllowPassword(!!j?.allowPasswordLogin))
      .catch(() => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [search])

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setDebugLink(null)
    try {
      const res = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { signIn } = await import('next-auth/react')
      const result = await signIn('credentials', { username, password, redirect: false })
      if (result?.error) {
        setError('用户名或密码错误')
      } else {
        router.push('/admin')
      }
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-box">
          <h1 className="admin-login-heading">登录链接已发送</h1>
          <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 16 }}>
            请到 <strong style={{ color: 'var(--gold-bright)' }}>{email}</strong> 查收邮件，
            点击里面的按钮登录。链接 15 分钟内有效。
          </p>
          {debugLink && (
            <div
              style={{
                background: 'rgba(245,199,26,0.08)',
                border: '1px solid rgba(245,199,26,0.25)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: '0.82rem',
                color: 'var(--text-dim)',
                wordBreak: 'break-all',
              }}
            >
              <strong style={{ color: 'var(--gold-bright)' }}>[DEV ONLY]</strong> 当前未配置邮件服务，
              请直接点击下方链接登录：
              <div style={{ marginTop: 8 }}>
                <a href={debugLink} style={{ color: 'var(--gold-mid)' }}>{debugLink}</a>
              </div>
            </div>
          )}
          <button
            type="button"
            className="admin-login-btn"
            onClick={() => { setSent(false); setDebugLink(null); setEmail('') }}
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-box">
        <h1 className="admin-login-heading">管理员登录</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.6 }}>
          输入邮箱，我们会发送一个一次性登录链接。
        </p>
        <form onSubmit={requestLink} className="admin-login-form">
          <div className="admin-login-field">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          {error && <p className="admin-login-error">{error}</p>}
          <button type="submit" disabled={loading || !email} className="admin-login-btn">
            {loading ? '发送中…' : '发送登录链接'}
          </button>
        </form>

        {allowPassword && (
          <>
            <div style={{ margin: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              — 或 —
            </div>
            <form onSubmit={handlePasswordLogin} className="admin-login-form">
              <div className="admin-login-field">
                <label htmlFor="username">用户名</label>
                <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="admin-login-field">
                <label htmlFor="password">密码</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="admin-login-btn">
                {loading ? '登录中…' : '密码登录'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}