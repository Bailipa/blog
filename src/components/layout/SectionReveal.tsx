'use client'

import { useEffect, useRef } from 'react'

export function SectionReveal() {
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    )
    const titles = document.querySelectorAll('.section-title')
    titles.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return null
}
