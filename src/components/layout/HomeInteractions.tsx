'use client'

import { useEffect, useRef, useState } from 'react'

interface CategoryNavItem {
  slug: string
  name: string
  count: number
}

interface Props {
  items: CategoryNavItem[]
}

export function HomeInteractions({ items }: Props) {
  const [activeSlug, setActiveSlug] = useState<string>('all')
  const [progress, setProgress] = useState(0)
  const [lifted, setLifted] = useState(false)
  const scheduled = useRef(false)

  useEffect(() => {
    const sections = items
      .map((it) => ({ slug: it.slug, el: document.getElementById(`section-${it.slug}`) }))
      .filter((x): x is { slug: string; el: HTMLElement } => Boolean(x.el))

    const compute = () => {
      scheduled.current = false
      const offset = 140
      let active = 'all'
      for (const s of sections) {
        const top = s.el.getBoundingClientRect().top
        if (top - offset <= 0) active = s.slug
      }
      setActiveSlug(active)

      const doc = document.documentElement
      const scrollTop = window.scrollY
      const height = doc.scrollHeight - doc.clientHeight
      setProgress(height > 0 ? Math.min(1, Math.max(0, scrollTop / height)) : 0)
      setLifted(scrollTop > 80)
    }

    const schedule = () => {
      if (scheduled.current) return
      scheduled.current = true
      requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [items])

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault()
    if (slug === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      history.replaceState(null, '', ' ')
      return
    }
    const el = document.getElementById(`section-${slug}`)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 100
    window.scrollTo({ top, behavior: 'smooth' })
    history.replaceState(null, '', `#${slug}`)
  }

  return (
    <nav className={`category-nav ${lifted ? 'is-lifted' : ''}`} aria-label="分类锚点导航">
      <div className="category-nav-progress" aria-hidden="true">
        <span className="category-nav-progress-bar" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <button
        type="button"
        className="category-nav-scroll category-nav-scroll-left"
        aria-label="向左滚动分类"
        onClick={() => {
          const inner = document.querySelector<HTMLElement>('.category-nav-inner')
          if (inner) inner.scrollBy({ left: -200, behavior: 'smooth' })
        }}
      >‹</button>
      <div className="category-nav-inner">
        <a
          href="#top"
          onClick={(e) => handleAnchor(e, 'all')}
          className={`category-nav-item ${activeSlug === 'all' ? 'is-active' : ''}`}
        >
          <span className="category-nav-item-name">全部</span>
          <span className="category-nav-item-count">{items.reduce((s, i) => s + i.count, 0)}</span>
        </a>
        {items.map((it) => (
          <a
            key={it.slug}
            href={`#${it.slug}`}
            onClick={(e) => handleAnchor(e, it.slug)}
            className={`category-nav-item ${activeSlug === it.slug ? 'is-active' : ''}`}
          >
            <span className="category-nav-item-name">{it.name}</span>
            <span className="category-nav-item-count">{it.count}</span>
          </a>
        ))}
      </div>
      <button
        type="button"
        className="category-nav-scroll category-nav-scroll-right"
        aria-label="向右滚动分类"
        onClick={() => {
          const inner = document.querySelector<HTMLElement>('.category-nav-inner')
          if (inner) inner.scrollBy({ left: 200, behavior: 'smooth' })
        }}
      >›</button>
    </nav>
  )
}