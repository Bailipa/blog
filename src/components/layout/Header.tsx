'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { resolveAvatarUrl } from '@/lib/username'

export function Header() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const isLoggedIn = status === 'authenticated' && session?.user
  const isAdmin = isLoggedIn && session.user.isAdmin
  const userName = isLoggedIn ? (session.user.name ?? session.user.email ?? '用户') : ''
  const userAvatar = isLoggedIn
    ? resolveAvatarUrl({ avatarUrl: null, email: session.user.email ?? null })
    : null

  return (
    <nav className="nav revealed">
      <div className="nav-logo">
        <Link href="/">Lee&apos;s Blog</Link>
      </div>
      <ul className="nav-links">
        <li><Link href="/" className={pathname === '/' ? 'active' : ''}>首页</Link></li>
        <li><Link href="/blog" className={pathname.startsWith('/blog') ? 'active' : ''}>博客</Link></li>
        <li><Link href="/projects" className={pathname === '/projects' ? 'active' : ''}>作品</Link></li>
        <li><Link href="/about" className={pathname === '/about' ? 'active' : ''}>关于</Link></li>
      </ul>
      <div className="nav-user-area" ref={wrapRef}>
        {!isLoggedIn && status !== 'loading' && (
          <Link href="/login" className="nav-login-link">登录 / 注册</Link>
        )}
        {status === 'loading' && <span className="nav-user-skel" aria-hidden />}
        {isLoggedIn && (
          <>
            <button
              type="button"
              className="nav-user-btn"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatar} alt="" className="nav-user-avatar" />
              ) : (
                <span className="nav-user-avatar nav-user-avatar-letter">
                  {(userName[0] ?? '?').toUpperCase()}
                </span>
              )}
              <span className="nav-user-name">{userName}</span>
              <span className="nav-user-caret">▾</span>
            </button>
            {open && (
              <div className="nav-user-menu" role="menu">
                {session.user.username ? (
                  <Link
                    href={`/u/${session.user.username}`}
                    className="nav-user-menu-item"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    我的主页
                  </Link>
                ) : (
                  <Link
                    href="/onboarding"
                    className="nav-user-menu-item"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    完善资料
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="nav-user-menu-item"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    管理后台
                  </Link>
                )}
                <button
                  type="button"
                  className="nav-user-menu-item nav-user-menu-danger"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    signOut({ callbackUrl: '/' })
                  }}
                >
                  退出登录
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  )
}