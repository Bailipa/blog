'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { resolveAvatarUrl } from '@/lib/username'

const NAV_LINKS = [
  { href: '/', label: '首页', match: (p: string) => p === '/' },
  { href: '/blog', label: '博客', match: (p: string) => p.startsWith('/blog') },
  { href: '/projects', label: '作品', match: (p: string) => p === '/projects' },
  { href: '/about', label: '关于', match: (p: string) => p === '/about' },
] as const

export function Header() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [userOpen, setUserOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const userWrapRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!userWrapRef.current?.contains(e.target as Node)) setUserOpen(false)
      if (!navRef.current?.contains(e.target as Node)) setMobileOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
    setUserOpen(false)
  }, [pathname])

  const isLoggedIn = status === 'authenticated' && session?.user
  const isAdmin = isLoggedIn && session.user.isAdmin
  const userName = isLoggedIn
    ? (session.user.name ?? session.user.username ?? session.user.email ?? '用户')
    : ''
  const userAvatar = isLoggedIn
    ? resolveAvatarUrl({ avatarUrl: session.user.image ?? null, email: session.user.email ?? null })
    : null

  return (
    <nav className="nav revealed" ref={navRef}>
      <div className="nav-logo">
        <Link href="/">Lee&apos;s Blog</Link>
      </div>

      <ul className="nav-links nav-links-desktop">
        {NAV_LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={l.match(pathname) ? 'active' : ''}>{l.label}</Link>
          </li>
        ))}
      </ul>

      <div className="nav-user-area" ref={userWrapRef}>
        {!isLoggedIn && status !== 'loading' && (
          <Link href="/login" className="nav-login-link nav-login-desktop">登录 / 注册</Link>
        )}
        {status === 'loading' && <span className="nav-user-skel" aria-hidden />}
        {isLoggedIn && (
          <>
            <button
              type="button"
              className="nav-user-btn"
              onClick={() => setUserOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userOpen}
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
            {userOpen && (
              <div className="nav-user-menu" role="menu">
                {session.user.username ? (
                  <>
                    <Link href={`/u/${session.user.username}`} className="nav-user-menu-item" role="menuitem" onClick={() => setUserOpen(false)}>我的主页</Link>
                    <Link href={`/u/${session.user.username}/edit`} className="nav-user-menu-item" role="menuitem" onClick={() => setUserOpen(false)}>编辑资料</Link>
                  </>
                ) : (
                  <Link href="/onboarding" className="nav-user-menu-item" role="menuitem" onClick={() => setUserOpen(false)}>完善资料</Link>
                )}
                {isAdmin && (
                  <Link href="/admin" className="nav-user-menu-item" role="menuitem" onClick={() => setUserOpen(false)}>管理后台</Link>
                )}
                <button
                  type="button"
                  className="nav-user-menu-item nav-user-menu-danger"
                  role="menuitem"
                  onClick={() => { setUserOpen(false); signOut({ callbackUrl: '/' }) }}
                >
                  退出登录
                </button>
              </div>
            )}
          </>
        )}

        <button
          type="button"
          className="nav-burger"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={mobileOpen}
        >
          <span className={`nav-burger-line ${mobileOpen ? 'open' : ''}`} />
          <span className={`nav-burger-line ${mobileOpen ? 'open' : ''}`} />
          <span className={`nav-burger-line ${mobileOpen ? 'open' : ''}`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="nav-mobile-menu" role="menu">
          <ul className="nav-mobile-links">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`nav-mobile-link ${l.match(pathname) ? 'active' : ''}`}>{l.label}</Link>
              </li>
            ))}
          </ul>
          {!isLoggedIn && (
            <Link href="/login" className="nav-mobile-link nav-mobile-cta">登录 / 注册</Link>
          )}
          {isLoggedIn && !session.user.username && (
            <Link href="/onboarding" className="nav-mobile-link nav-mobile-cta">完善资料</Link>
          )}
          {isLoggedIn && session.user.username && (
            <>
              <Link href={`/u/${session.user.username}`} className="nav-mobile-link nav-mobile-cta">个人主页</Link>
              <Link href={`/u/${session.user.username}/edit`} className="nav-mobile-link nav-mobile-cta">编辑资料</Link>
            </>
          )}
          {isAdmin && <Link href="/admin" className="nav-mobile-link nav-mobile-cta">管理后台</Link>}
          {isLoggedIn && (
            <button
              type="button"
              className="nav-mobile-link nav-mobile-link-danger"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              退出登录
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
