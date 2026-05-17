'use client'

import { useEffect, useRef } from 'react'

export function SpotlightTracker() {
  const rafRef = useRef(0)

  useEffect(() => {
    let targetX = 50, targetY = 50
    let currentX = 50, currentY = 50

    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth) * 100
      targetY = (e.clientY / window.innerHeight) * 100
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

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return null
}
