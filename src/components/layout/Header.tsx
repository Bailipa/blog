'use client'

export function Header() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="nav revealed">
      <div className="nav-logo">Lee&apos;s Blog</div>
      <ul className="nav-links">
        <li><a href="/">首页</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo('posts') }}>博客</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo('projects') }}>作品</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); scrollTo('about') }}>关于</a></li>
      </ul>
    </nav>
  )
}
