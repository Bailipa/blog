'use client'

import { useEffect, useRef } from 'react'

export function SpotlightTracker() {
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    let targetX = 50, targetY = 50
    let currentX = 50, currentY = 50
    let isIdle = true

    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth) * 100
      targetY = (e.clientY / window.innerHeight) * 100

      if (isIdle) {
        isIdle = false
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    document.addEventListener('mousemove', onMouseMove)

    const loop = () => {
      currentX += (targetX - currentX) * 0.08
      currentY += (targetY - currentY) * 0.08

      const ps = document.getElementById('pageSpotlight')
      if (ps) {
        ps.style.setProperty('--mx', `${currentX}%`)
        ps.style.setProperty('--my', `${currentY}%`)
      }

      const settled = Math.abs(currentX - targetX) < 0.1 && Math.abs(currentY - targetY) < 0.1
      if (settled) {
        isIdle = true
        rafRef.current = null
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return null
}
