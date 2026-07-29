'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoginSuccess, type LoginSuccessUser } from '@/components/auth/LoginSuccess'

// Next.js needs this page to opt out of static prerender because
// useSearchParams() inside the child requires a runtime context.
// We wrap the form in <Suspense> as required by the framework when
// reading search params in a client component.
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 10 * 60 * 1000  // 10 min — matches the new token TTL
const CODE_LENGTH = 6

// Generate a UUID-ish pair token (browser side). This is the secret that
// links browser A's polling to the verification event triggered by browser B.
// UUIDv4 via crypto.randomUUID() when available, fallback for old browsers.
function generatePairToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 32)
  }
  // Fallback: 32 hex chars from Math.random (not crypto-secure but
  // unique-enough for this purpose).
  const arr = new Uint8Array(16)
  if (typeof crypto !== 'undefined') crypto.getRandomValues(arr)
  else for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

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
  const [debugCode, setDebugCode] = useState<string | null>(null)
  // Verified user data — set when either pairing or code path completes.
  const [verifiedUser, setVerifiedUser] = useState<LoginSuccessUser | null>(null)
  // Pair token, generated once per /login instance. Stored in localStorage
  // so a page refresh doesn't break the pairing handshake.
  const pairTokenRef = useRef<string>('')

  const callbackUrl = search.get('callbackUrl') || '/'

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const reason = search.get('error')
    if (reason === 'token-invalid') setError('登录链接无效，请重新获取。')
    else if (reason === 'token-expired') setError('登录链接已过期（10 分钟），请重新获取。')
    else if (reason === 'missing-token') setError('链接无效。')
    else if (reason === 'signin-failed') setError('登录失败，请重试。')
    else if (reason === 'account-deleted') setError('该账号已被注销。')
    else if (reason === 'session-missing') setError('会话失效，请重新登录。')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [search])

  // Generate pairToken once on mount. Persist in localStorage so a tab
  // refresh keeps the same pairing token (the email link still points
  // to this token).
  useEffect(() => {
    if (!pairTokenRef.current) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('loginPairToken') : null
      pairTokenRef.current = stored && stored.length >= 8 ? stored : generatePairToken()
      if (typeof window !== 'undefined') {
        localStorage.setItem('loginPairToken', pairTokenRef.current)
      }
    }
  }, [])

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setDebugLink(null)
    setDebugCode(null)
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
        body: JSON.stringify({
          email: trimmed,
          callbackUrl,
          pairToken: pairTokenRef.current,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '发送失败')
        return
      }
      setSent(true)
      if (json.debugLink) setDebugLink(json.debugLink)
      if (json.debugCode) setDebugCode(json.debugCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常')
    } finally {
      setLoading(false)
    }
  }

  // Polling: detect when pairing has been approved and session is set.
  // Stops once verifiedUser is set, or after POLL_TIMEOUT_MS.
  const pollStartedAt = useRef<number | null>(null)
  useEffect(() => {
    if (!sent) return
    if (verifiedUser) return
    pollStartedAt.current = Date.now()

    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      if (pollStartedAt.current && Date.now() - pollStartedAt.current > POLL_TIMEOUT_MS) {
        return
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
        // ignore
      }
      if (!cancelled) setTimeout(tick, POLL_INTERVAL_MS)
    }
    setTimeout(tick, POLL_INTERVAL_MS)

    // Also poll the dedicated pair-status endpoint so we can detect
    // pairing completion specifically (and avoid hammering /api/users/me).
    // Actually /api/users/me gives us everything we need; pair-status
    // is only called explicitly when we want a fresh cookie issuance.
    // For now the /api/users/me poll covers the case where the user
    // clicked the link in the SAME browser (cookie set immediately).
    // The pair-status handshake is handled server-side: when browser B
    // clicks the link, browser B's verify route sets the cookie on
    // browser B. Browser A's /api/users/me poll will detect the session
    // if and only if browser A already had a cookie — which it won't,
    // because the session is on browser B.
    //
    // Therefore we ALSO need to poll pair-status to get the cookie
    // installed on browser A. Run both polls.
    const pairTick = async () => {
      if (cancelled) return
      if (pollStartedAt.current && Date.now() - pollStartedAt.current > POLL_TIMEOUT_MS) {
        return
      }
      try {
        const r = await fetch('/api/auth/pair-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairToken: pairTokenRef.current }),
        })
        if (cancelled) return
        if (r.ok) {
          const j = await r.json()
          if (j.approved) {
            // Cookie was set on this response. Now fetch /api/users/me
            // to confirm and get full user data.
            const meRes = await fetch('/api/users/me', { cache: 'no-store' })
            if (meRes.ok) {
              const me = await meRes.json()
              const u = me?.user
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
          }
        }
      } catch {
        // ignore
      }
      if (!cancelled) setTimeout(pairTick, POLL_INTERVAL_MS)
    }
    setTimeout(pairTick, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      pollStartedAt.current = null
    }
  }, [sent, verifiedUser])

  // Code-path success: when the user types 6 digits and verifies.
  const submitCode = useCallback(async (code: string) => {
    setError('')
    try {
      const r = await fetch('/api/auth/public/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, callbackUrl }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j.ok && j.user?.id) {
        // Cookie was set on this response. Show LoginSuccess.
        setVerifiedUser({
          username: j.user.username,
          name: j.user.name,
          email: j.user.email,
          avatarUrl: null,
          isAdmin: j.user.isAdmin,
          onboarded: j.user.onboarded ?? false,
        })
        return
      }
      setError(j.error ?? '验证失败')
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常')
    }
  }, [email, callbackUrl])

  // Polling detected a session → render the shared success UI.
  if (verifiedUser) {
    return <LoginSuccess user={verifiedUser} callbackUrl={callbackUrl} />
  }

  if (sent) {
    return (
      <SentState
        email={email}
        error={error}
        debugLink={debugLink}
        debugCode={debugCode}
        onSubmitCode={submitCode}
        onBack={() => {
          setSent(false)
          setDebugLink(null)
          setDebugCode(null)
          setError('')
        }}
      />
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

// ===== Sent state: pairToken polling + OTP input =====

interface SentStateProps {
  email: string
  error: string
  debugLink: string | null
  debugCode: string | null
  onSubmitCode: (code: string) => Promise<void>
  onBack: () => void
}

function SentState({ email, error, debugLink, debugCode, onSubmitCode, onBack }: SentStateProps) {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [verifying, setVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleCodeChange = useCallback((idx: number, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (digits.length === 0) {
      setCode((prev) => {
        const next = [...prev]
        next[idx] = ''
        return next
      })
      return
    }
    // If user pasted a full 6-digit string into one cell, distribute it.
    if (digits.length > 1) {
      setCode(digits.slice(0, CODE_LENGTH).split(''))
      // Focus the last filled cell, or submit
      const lastIdx = Math.min(digits.length - 1, CODE_LENGTH - 1)
      inputRefs.current[lastIdx]?.focus()
      if (digits.length === CODE_LENGTH) {
        // Submit on next tick so state is set
        setTimeout(() => {
          const submitCode = digits
          setVerifying(true)
          onSubmitCode(submitCode).finally(() => setVerifying(false))
        }, 0)
      }
      return
    }
    // Single digit
    setCode((prev) => {
      const next = [...prev]
      next[idx] = digits
      return next
    })
    if (idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus()
    } else {
      // Last cell filled — try submit
      const submitCode = (() => {
        const arr = [...code]
        arr[idx] = digits
        return arr.join('')
      })()
      if (submitCode.length === CODE_LENGTH && submitCode.match(/^\d{6}$/)) {
        setVerifying(true)
        onSubmitCode(submitCode).finally(() => setVerifying(false))
      }
    }
  }, [code, onSubmitCode])

  const handleKeyDown = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus()
    }
  }, [code])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (pasted.length === CODE_LENGTH) {
      e.preventDefault()
      setCode(pasted.split(''))
      inputRefs.current[CODE_LENGTH - 1]?.focus()
      setVerifying(true)
      onSubmitCode(pasted).finally(() => setVerifying(false))
    }
  }, [onSubmitCode])

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="login-heading">登录链接已发送</h1>
        <p className="login-sub">
          请到 <strong className="login-email">{email}</strong> 查收邮件。
        </p>
        <p className="login-hint" style={{ color: 'var(--gold-mid)' }}>
          <span className="login-poll-dot" aria-hidden /> 等待邮箱链接点击中…（最长 10 分钟）
        </p>

        <div className="login-otp-block">
          <p className="login-otp-label">或者直接输入 6 位验证码：</p>
          <div className="login-otp-inputs" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                value={digit}
                onChange={(e) => handleCodeChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onFocus={(e) => e.currentTarget.select()}
                disabled={verifying}
                className="login-otp-cell"
                aria-label={`验证码第 ${idx + 1} 位`}
              />
            ))}
          </div>
          {error && <p className="login-error">{error}</p>}
        </div>

        {debugLink && (
          <div className="login-dev-block">
            <strong>[DEV ONLY]</strong> 当前未配置邮件服务，请直接点击下方链接登录或使用验证码：
            <div style={{ marginTop: 8, wordBreak: 'break-all' }}>
              链接：<a href={debugLink} className="login-dev-link">{debugLink}</a>
            </div>
            {debugCode && (
              <div style={{ marginTop: 8 }}>
                验证码：<code style={{ fontSize: '1.1rem', letterSpacing: '0.2em', color: 'var(--gold-bright)' }}>{debugCode}</code>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className="login-btn"
          onClick={onBack}
        >
          返回
        </button>
      </div>
    </div>
  )
}