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

// Right-sidebar TOC. Mirrors labuladong's algo-toc:
//   - font-size 0.875rem
//   - sticky, top-14 (offset for fixed nav)
//   - active section highlighted via IntersectionObserver
//   - smooth scroll on click
export default function TableOfContents({ entries }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    if (entries.length === 0) return
    const observer = new IntersectionObserver(
      (observed) => {
        // Pick the topmost intersecting heading
        const visible = observed
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -70% 0px' },
    )

    for (const { id } of entries) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [entries])

  return (
    <nav className="algo-toc" aria-label="目录">
      <h3 className="algo-toc-title">本页内容</h3>
      <div className="algo-toc-panel">
        <ul className="algo-toc-list">
          {entries.map((entry) => (
            <li key={entry.id} className={`algo-toc-item toc-level-${entry.level}`}>
              <a
                href={`#${entry.id}`}
                className={`algo-toc-link${activeId === entry.id ? ' active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  history.replaceState(null, '', `#${entry.id}`)
                }}
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
