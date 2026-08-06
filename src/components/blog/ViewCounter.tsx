'use client'

import { useEffect, useRef } from 'react'

// Records one view per post per browser. Dedupes with localStorage so a
// refresh or repeat visit in the same browser doesn't inflate the count.
const KEY_PREFIX = 'lb_viewed_'

export function ViewCounter({ slug }: { slug: string }) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    const key = KEY_PREFIX + slug
    try {
      if (localStorage.getItem(key)) return
    } catch {
      // localStorage unavailable (private mode etc.) — still count once per mount.
    }
    sent.current = true
    // Fire-and-forget; never block rendering or react to the response.
    fetch(`/api/post-views/${encodeURIComponent(slug)}`, { method: 'PATCH' }).catch(() => {})
    try {
      localStorage.setItem(key, '1')
    } catch {}
  }, [slug])

  return null
}
