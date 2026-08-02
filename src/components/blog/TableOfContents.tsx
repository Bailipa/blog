'use client'

import { useEffect, useState } from 'react'

interface TocEntry {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  entries: TocEntry[]
}

// Renders the article TOC in two forms, mutually exclusive via CSS:
//   - Desktop (>=1280px): sticky right-side aside (.article-toc-cell > .article-toc-inner)
//   - Tablet/Mobile (<1280px): floating action button + slide-in drawer
// Both forms share the same activeId (driven by scroll position) and click behavior.
export default function TableOfContents({ entries }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  // Scroll-based active heading detection.
  //
  // active = the LAST heading whose top has crossed the nav offset (~80px).
  // This is more reliable than IntersectionObserver for TOC highlighting:
  //   - No lag from a "trigger zone" — the highlight flips exactly when the
  //     user scrolls a heading under the fixed nav.
  //   - No "observed" blind spot when the topmost heading exits a trigger
  //     zone (IO callbacks only fire for entries whose state changed).
  //
  // rAF-throttled so we never run getBoundingClientRect more than once
  // per frame even if scroll/resize events fire in bursts.
  useEffect(() => {
    if (entries.length === 0) return
    const headingEls = entries
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (headingEls.length === 0) return

    const navOffset = 80
    let rafId: number | null = null

    const compute = () => {
      rafId = null
      let active = ''
      // Headings are in document order. As soon as we find one whose top
      // is below the nav offset, every subsequent one is also below it,
      // so we can stop iterating.
      for (const el of headingEls) {
        if (el.getBoundingClientRect().top <= navOffset) {
          active = el.id
        } else {
          break
        }
      }
      setActiveId(active)
    }
    const schedule = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [entries])

  // Sync the TOC's own scroll position so the active item is visible.
  // Both the desktop sidebar list and the mobile drawer body are scrollable,
  // and we render two copies of every link — so we scrollIntoView on all
  // matches and let each find its nearest scrollable ancestor.
  // Deps include drawerOpen so opening the drawer snaps to the active item.
  useEffect(() => {
    if (!activeId) return
    const id = requestAnimationFrame(() => {
      document
        .querySelectorAll<HTMLAnchorElement>(`.algo-toc-link[href="#${activeId}"]`)
        .forEach((link) => link.scrollIntoView({ block: 'nearest' }))
    })
    return () => cancelAnimationFrame(id)
  }, [activeId, drawerOpen])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    // Let modifier-clicks behave normally (open in new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    setActiveId(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
    setDrawerOpen(false)
  }

  const list = (
    <nav className="algo-toc" aria-label="目录">
      <h3 className="algo-toc-title">本页内容</h3>
      <ul className="algo-toc-list">
        {entries.map((entry) => (
          <li key={entry.id} className={`algo-toc-item toc-level-${entry.level}`}>
            <a
              href={`#${entry.id}`}
              className={`algo-toc-link${activeId === entry.id ? ' active' : ''}`}
              onClick={(e) => handleClick(e, entry.id)}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <>
      <aside className="article-toc-cell">
        <div className="article-toc-inner">{list}</div>
      </aside>

      <button
        type="button"
        className="toc-fab"
        onClick={() => setDrawerOpen(true)}
        aria-label="打开目录"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>

      {drawerOpen && (
        <>
          <div
            className="toc-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="toc-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="文章目录"
          >
            <header className="toc-drawer-header">
              <h3>本页内容</h3>
              <button
                type="button"
                className="toc-drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="关闭目录"
              >
                ×
              </button>
            </header>
            <div className="toc-drawer-body">{list}</div>
          </aside>
        </>
      )}
    </>
  )
}