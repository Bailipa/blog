'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolveAvatarUrl } from '@/lib/username'

export interface LoginSuccessUser {
  username: string | null
  name: string | null
  email: string | null
  avatarUrl: string | null
  isAdmin: boolean
  onboarded: boolean
}

interface LoginSuccessProps {
  user: LoginSuccessUser
  callbackUrl: string
  countdownSeconds?: number
}

// Renders the "✅ 登录成功" page that shows briefly after a magic-link click
// (or after polling on /login detects a session). Shows the user identity,
// a destination button, and auto-redirects after `countdownSeconds` (default 3s).
//
// Used by both /login/success (the landing page) and /login (when polling
// detects the session). Both render the same visual — single source of truth.
export function LoginSuccess({ user, callbackUrl, countdownSeconds = 3 }: LoginSuccessProps) {
  const router = useRouter()
  const [remaining, setRemaining] = useState(countdownSeconds)
  const [paused, setPaused] = useState(false)
  const redirectedRef = useRef(false)

  const target = pickDestination(user, callbackUrl)

  // Countdown
  useEffect(() => {
    if (paused) return
    if (remaining <= 0) {
      if (redirectedRef.current) return
      redirectedRef.current = true
      router.replace(target)
      return
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, paused, router, target])

  const displayName = user.name || user.username || user.email?.split('@')[0] || '用户'
  const avatar = resolveAvatarUrl(user)

  return (
    <div className="login-page">
      <div
        className="login-box login-success-box"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="login-success-check" aria-hidden>✓</div>
        <h1 className="login-heading">登录成功</h1>
        <div className="login-success-user">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="login-success-avatar" />
          ) : (
            <div className="login-success-avatar login-success-avatar-letter">
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="login-success-user-meta">
            <div className="login-success-name">{displayName}</div>
            {user.username && (
              <a href={`/u/${user.username}`} className="login-success-username">
                @{user.username}
              </a>
            )}
          </div>
        </div>
        <p className="login-success-hint">
          {paused
            ? '已暂停跳转，点击下方按钮继续'
            : `${remaining} 秒后自动跳转到${destinationLabel(target)}`}
        </p>
        <div className="login-success-actions">
          <button
            type="button"
            className="login-btn"
            onClick={() => {
              if (redirectedRef.current) return
              redirectedRef.current = true
              router.replace(target)
            }}
          >
            立即前往{destinationLabel(target)}
          </button>
        </div>
      </div>
    </div>
  )
}

function destinationLabel(url: string): string {
  if (url.startsWith('/admin')) return '管理后台'
  if (url.startsWith('/u/')) return '个人主页'
  if (url.startsWith('/blog/')) return '文章'
  if (url.startsWith('/blog')) return '博客'
  if (url === '/') return '首页'
  return '目标页'
}

function pickDestination(user: LoginSuccessUser, callbackUrl: string): string {
  // Sanitize: must start with single / (no protocol-relative //)
  const safe = callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/'
  return safe
}