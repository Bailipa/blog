'use client'

import { useState, useEffect } from 'react'

interface TocEntry {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  entries: TocEntry[]
}

export default function TableOfContents({ entries }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' },
    )

    for (const { id } of entries) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [entries])

  return (
    <nav className="toc">
      <h3 className="toc-title">目录</h3>
      <ul className="toc-list">
        {entries.map((entry) => (
          <li key={entry.id} className={`toc-item toc-level-${entry.level}`}>
            <a
              href={`#${entry.id}`}
              className={`toc-link${activeId === entry.id ? ' active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
