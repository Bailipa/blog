'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()

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
    </nav>
  )
}
