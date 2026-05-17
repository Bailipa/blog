'use client'

import { useEffect, useRef } from 'react'

export function HomeInteractions() {
  const inited = useRef(false)

  useEffect(() => {
    if (inited.current) return
    inited.current = true

    // Category filter
    const tags = document.querySelectorAll('.filter-tag')
    const container = document.querySelector('.posts-scroll')
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
      if (container) container.scrollLeft = 0
    }
    tags.forEach((t) => t.addEventListener('click', handleTagClick))

    // Auto-scroll: posts
    const postsEl = document.querySelector('.posts-scroll')
    let paused1 = false
    let timer1: ReturnType<typeof setTimeout> | null = null
    const onWheel1 = (e: Event) => {
      const we = e as WheelEvent
      we.preventDefault()
      if (postsEl) postsEl.scrollLeft += we.deltaX
      paused1 = true
      if (timer1) clearTimeout(timer1)
      timer1 = setTimeout(() => { paused1 = false }, 4000)
    }
    postsEl?.addEventListener('wheel', onWheel1, { passive: false })

    let raf1 = 0
    const loop1 = () => {
      if (!paused1 && postsEl) postsEl.scrollLeft += 0.6
      const half1 = postsEl ? postsEl.scrollWidth / 2 : 0
      if (half1 > 0 && postsEl && postsEl.scrollLeft >= half1) postsEl.scrollLeft -= half1
      if (half1 > 0 && postsEl && postsEl.scrollLeft <= 0) postsEl.scrollLeft += half1
      raf1 = requestAnimationFrame(loop1)
    }
    raf1 = requestAnimationFrame(loop1)

    // Auto-scroll: projects
    const projEl = document.querySelector('.projects-grid')
    let paused2 = false
    let timer2: ReturnType<typeof setTimeout> | null = null
    const onWheel2 = (e: Event) => {
      const we = e as WheelEvent
      we.preventDefault()
      if (projEl) projEl.scrollLeft += we.deltaX
      paused2 = true
      if (timer2) clearTimeout(timer2)
      timer2 = setTimeout(() => { paused2 = false }, 4000)
    }
    projEl?.addEventListener('wheel', onWheel2, { passive: false })

    let raf2 = 0
    const loop2 = () => {
      if (!paused2 && projEl) projEl.scrollLeft += 0.5
      const half2 = projEl ? projEl.scrollWidth / 2 : 0
      if (half2 > 0 && projEl && projEl.scrollLeft >= half2) projEl.scrollLeft -= half2
      if (half2 > 0 && projEl && projEl.scrollLeft <= 0) projEl.scrollLeft += half2
      raf2 = requestAnimationFrame(loop2)
    }
    raf2 = requestAnimationFrame(loop2)

    // Auto-scroll: mumbles
    const mumblesEl = document.querySelector('.mumbles-scroll')
    let paused3 = false
    let timer3: ReturnType<typeof setTimeout> | null = null
    const onWheel3 = (e: Event) => {
      const we = e as WheelEvent
      we.preventDefault()
      if (mumblesEl) mumblesEl.scrollLeft += we.deltaX
      paused3 = true
      if (timer3) clearTimeout(timer3)
      timer3 = setTimeout(() => { paused3 = false }, 4000)
    }
    mumblesEl?.addEventListener('wheel', onWheel3, { passive: false })

    let raf3 = 0
    const loop3 = () => {
      if (!paused3 && mumblesEl) mumblesEl.scrollLeft -= 0.5
      const half3 = mumblesEl ? mumblesEl.scrollWidth / 2 : 0
      if (half3 > 0 && mumblesEl && mumblesEl.scrollLeft >= half3) mumblesEl.scrollLeft -= half3
      if (half3 > 0 && mumblesEl && mumblesEl.scrollLeft <= 0) mumblesEl.scrollLeft += half3
      raf3 = requestAnimationFrame(loop3)
    }
    raf3 = requestAnimationFrame(loop3)

    // Auto-snap scroll
    let snapTimer: ReturnType<typeof setTimeout> | null = null
    const onScroll = () => {
      if (snapTimer) clearTimeout(snapTimer)
      snapTimer = setTimeout(() => {
        const idx = Math.round(window.scrollY / window.innerHeight)
        window.scrollTo({ top: idx * window.innerHeight, behavior: 'smooth' })
      }, 200)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      inited.current = false
      tags.forEach((t) => t.removeEventListener('click', handleTagClick))
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      cancelAnimationFrame(raf3)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return null
}
