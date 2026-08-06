'use client'

import { useEffect, useState } from 'react'

// Fixed gold bar at the very top of the viewport showing scroll progress
// through the article. rAF-throttled so it never runs more than once a frame.
export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let rafId: number | null = null
    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const doc = document.documentElement
        const total = doc.scrollHeight - doc.clientHeight
        setProgress(total > 0 ? Math.min(1, window.scrollY / total) : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      className="reading-progress"
      aria-hidden="true"
      style={{ transform: `scaleX(${progress})` }}
    />
  )
}
