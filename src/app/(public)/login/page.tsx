'use client'

import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoginSuccess, type LoginSuccessUser } from '@/components/auth/LoginSuccess'

// useSearchParams() forces the route to be dynamic. We also wrap the
// inner component in <Suspense> as required by Next.js when a client
// component reads search params.
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_LENGTH = 6

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const search = useSearchParams()
  const callbackUrl = search.get('callbackUrl') || '/'

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [verifiedUser, setVerifiedUser] = useState<LoginSuccessUser | null>(null)

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setDebugCode(null)
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setError('邮箱格式不正确')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/public/request-code', {
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
      if (json.debugCode) setDebugCode(json.debugCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常')
    } finally {
      setLoading(false)
    }
  }

  // Verify the 6-digit code. On success, setVerifiedUser re-renders the
  // page to the inline LoginSuccess component (the cookie was set on the
  // verify-code response).
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

  if (verifiedUser) {
    return <LoginSuccess user={verifiedUser} callbackUrl={callbackUrl} />
  }

  if (sent) {
    return (
      <SentState
        email={email}
        error={error}
        debugCode={debugCode}
        onSubmitCode={submitCode}
        onBack={() => {
          setSent(false)
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
          输入邮箱，我们会发送一个 6 位验证码。新邮箱会自动注册账号。
        </p>
        <form onSubmit={requestCode} className="login-form">
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
            {loading ? '发送中…' : '发送验证码'}
          </button>
        </form>
        <p className="login-footer-hint">
          管理员请到 <a href="/admin/login" className="login-link-inline">/admin/login</a>
        </p>
      </div>
    </div>
  )
}

// ===== Sent state: 6-cell OTP input =====

interface SentStateProps {
  email: string
  error: string
  debugCode: string | null
  onSubmitCode: (code: string) => Promise<void>
  onBack: () => void
}

function SentState({ email, error, debugCode, onSubmitCode, onBack }: SentStateProps) {
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
    if (digits.length > 1) {
      const filled = digits.slice(0, CODE_LENGTH).split('')
      setCode(filled)
      const lastIdx = filled.length - 1
      inputRefs.current[lastIdx]?.focus()
      if (filled.length === CODE_LENGTH) {
        setVerifying(true)
        onSubmitCode(digits.slice(0, CODE_LENGTH)).finally(() => setVerifying(false))
      }
      return
    }
    setCode((prev) => {
      const next = [...prev]
      next[idx] = digits
      return next
    })
    if (idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus()
    } else {
      const submitCode = (() => {
        const arr = [...code]
        arr[idx] = digits
        return arr.join('')
      })()
      if (submitCode.length === CODE_LENGTH && /^\d{6}$/.test(submitCode)) {
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

  // Auto-fill from dev debug code if present, so local dev doesn't need
  // a manual copy-paste. Single-shot on mount.
  const autofilledRef = useRef(false)
  useEffect(() => {
    if (!debugCode || autofilledRef.current) return
    if (!code.every((c) => !c)) return
    autofilledRef.current = true
    const filled = debugCode.split('')
    /* eslint-disable react-hooks/set-state-in-effect */
    setCode(filled)
    setVerifying(true)
    /* eslint-enable react-hooks/set-state-in-effect */
    onSubmitCode(debugCode).finally(() => setVerifying(false))
    // Intentionally exclude `code` and `onSubmitCode` — we want this to
    // run once when debugCode arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugCode])

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="login-heading">验证码已发送</h1>
        <p className="login-sub">
          请到 <strong className="login-email">{email}</strong> 查收邮件，输入邮件中的 6 位验证码。
        </p>
        <p className="login-hint" style={{ color: 'var(--gold-mid)' }}>
          验证码 10 分钟内有效，仅可使用一次。
        </p>

        <div className="login-otp-block">
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

        {debugCode && (
          <div className="login-dev-block">
            <strong>[DEV ONLY]</strong> 当前未配置邮件服务，验证码：
            <div style={{ marginTop: 8 }}>
              <code style={{ fontSize: '1.4rem', letterSpacing: '0.3em', color: 'var(--gold-bright)' }}>{debugCode}</code>
            </div>
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
