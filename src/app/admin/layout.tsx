'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { ToastProvider } from '@/components/admin/ToastProvider'

const links = [
  { href: '/admin', label: '概览', icon: '⊞' },
  { href: '/admin/posts', label: '文章', icon: '📄' },
  { href: '/admin/categories', label: '分类', icon: '📂' },
  { href: '/admin/tags', label: '标签', icon: '🏷' },
  { href: '/admin/mumbles', label: '碎碎念', icon: '💬' },
  { href: '/admin/friend-links', label: '友链', icon: '🔗' },
  { href: '/admin/projects', label: '作品', icon: '💻' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/admin/login') {
    return (
      <div className="admin-root">
        <main className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </main>
      </div>
    )
  }

  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Link href="/admin">
            <span className="admin-sidebar-logo">LB</span>
          </Link>
        </div>
        <nav className="admin-sidebar-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`admin-sidebar-link${active(link.href) ? ' active' : ''}`}
            >
              <span className="admin-sidebar-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-sidebar-link" target="_blank">
            ← 查看网站
          </Link>
          <Link href="/admin/password" className="admin-sidebar-link">
            修改密码
          </Link>
          <button
            className="admin-sidebar-link admin-logout-btn"
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
          >
            退出登录
          </button>
        </div>
      </aside>
      <main className="admin-content">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  )
}
