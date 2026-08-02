'use client'

import { useEffect, useRef } from 'react'

// Home-page-only interactions: category filter on the latest-posts row.
// (Scroll-snap and auto-marquee were removed in Phase 1 — the carousel
//  scrolls naturally now, no JS interference.)
export function HomeInteractions() {
  const inited = useRef(false)

  useEffect(() => {
    if (inited.current) return
    inited.current = true

    const tags = document.querySelectorAll('.filter-tag')
    const handleTagClick = (e: Event) => {
      const t = e.currentTarget as HTMLElement
      tags.forEach((t2) => t2.classList.remove('active'))
      t.classList.add('active')
      const f = t.getAttribute('data-filter')
      const cards = document.querySelectorAll<HTMLElement>('.posts-track > a[data-category]')
      cards.forEach((c) => {
        c.style.display =
          f === 'all' || c.getAttribute('data-category') === f ? '' : 'none'
      })
      // Reset scroll position so the first matching card is in view
      const scroller = document.querySelector<HTMLElement>('.posts-scroll')
      if (scroller) scroller.scrollLeft = 0
    }
    tags.forEach((t) => t.addEventListener('click', handleTagClick))

    return () => {
      inited.current = false
      tags.forEach((t) => t.removeEventListener('click', handleTagClick))
    }
  }, [])

  return null
}
