'use client'

import { useEffect, useRef } from 'react'

interface CategoryNavItem {
  slug: string
  name: string
  count: number
}

interface Props {
  items: CategoryNavItem[]
}

// All scroll-driven state (active item, progress bar, lifted/visible
// classes) is applied directly to the DOM via refs. React renders the nav
// once; scrolling never triggers a re-render or reconciliation of the 8
// category links — the "slow refresh / laggy highlight" the user reported
// was React re-rendering the whole nav on every scroll event.
export function HomeInteractions({ items }: Props) {
  const navRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const scheduled = useRef(false)
  const total = items.reduce((s, i) => s + i.count, 0)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const sections = items
      .map((it) => ({ slug: it.slug, el: document.getElementById(`section-${it.slug}`) }))
      .filter((x): x is { slug: string; el: HTMLElement } => Boolean(x.el))
    const links = Array.from(
      nav.querySelectorAll<HTMLAnchorElement>('.category-nav-item'),
    )
    const linkBySlug = new Map<string, HTMLAnchorElement>()
    links.forEach((link) => {
      const href = link.getAttribute('href') ?? ''
      const slug = href === '#top' ? 'all' : href.slice(1)
      linkBySlug.set(slug, link)
    })

    const compute = () => {
      scheduled.current = false
      const offset = 140
      let active = 'all'
      for (const s of sections) {
        if (s.el.getBoundingClientRect().top - offset <= 0) active = s.slug
      }

      // Active highlight — pure DOM class toggle, no React.
      links.forEach((link) =>
        link.classList.toggle('is-active', linkBySlug.get(active) === link),
      )

      // Progress bar — set transform directly.
      const doc = document.documentElement
      const scrollTop = window.scrollY
      const height = doc.scrollHeight - doc.clientHeight
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${
          height > 0 ? Math.min(1, Math.max(0, scrollTop / height)) : 0
        })`
      }

      // Lifted shadow + visibility — class toggles only.
      nav.classList.toggle('is-lifted', scrollTop > 80)
      nav.classList.toggle('is-visible', scrollTop > window.innerHeight * 0.5)
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
    <nav
      ref={navRef}
      className="category-nav"
      aria-label="分类锚点导航"
    >
      <div className="category-nav-progress" aria-hidden="true">
        <span ref={barRef} className="category-nav-progress-bar" />
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
          className="category-nav-item"
        >
          <span className="category-nav-item-name">全部</span>
          <span className="category-nav-item-count">{total}</span>
        </a>
        {items.map((it) => (
          <a
            key={it.slug}
            href={`#${it.slug}`}
            onClick={(e) => handleAnchor(e, it.slug)}
            className="category-nav-item"
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
