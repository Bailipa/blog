'use client'

import * as React from 'react'
import Link from 'next/link'
import { HeroRings } from './HeroRings'
import { TaijiCenter } from './TaijiCenter'
import AxialDots from './AxialDots'

export default function CosmicHero() {
  const [heroRightRevealed, setHeroRightRevealed] = React.useState(false)
  const [heroLeftRevealed, setHeroLeftRevealed] = React.useState(false)

  React.useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return
    const svg = document.querySelector('.qimen-svg')
    if (!svg) return
    const ns = 'http://www.w3.org/2000/svg'

    const allRings = Array.from(svg.querySelectorAll('.breathe-1, .breathe-2, .breathe-3, .breathe-4, .breathe-5, .breathe-6, .breathe-7, .taiji-halo'))
    allRings.sort((a, b) => parseFloat(a.getAttribute('r') || '0') - parseFloat(b.getAttribute('r') || '0'))
    const rings = [allRings[0]].concat(allRings.slice(-7)).filter(Boolean)
    rings.forEach((circle, i) => {
      const wrapper = document.createElementNS(ns, 'g')
      wrapper.setAttribute('class', 'hr-boot')
      wrapper.style.animationDelay = `${0.1 + i * 0.08}s`
      wrapper.style.opacity = '0'
      circle.parentNode?.insertBefore(wrapper, circle)
      wrapper.appendChild(circle)
    })

    const bootChars = Array.from(svg.querySelectorAll('.hr-1 .yao-stroke, .hr-4 .yao-stroke, .hr-2 text, .hr-3 text, .hr-5 text, .hr-6 text, .hr-7 text, .hr-1 line, .hr-2 line, .hr-3 line, .hr-4 line, .hr-5 line, .hr-6 line, .hr-7 line'))
    const t0 = setTimeout(() => {
      bootChars.forEach(el => {
        (el as SVGElement).style.transition = 'opacity 0.6s ease-out 0.1s'
        ;(el as SVGElement).style.opacity = ''
      })
    }, 800)

    const taiji = document.querySelector('.taiji-group')
    if (taiji) {
      const w = document.createElementNS(ns, 'g')
      w.setAttribute('class', 'taiji-boot')
      w.style.opacity = '0'
      taiji.parentNode?.insertBefore(w, taiji)
      w.appendChild(taiji)
    }

    svg.querySelectorAll('.taiji-halo').forEach(h => {
      if (parseFloat(h.getAttribute('r') || '0') <= 60) return
      const w = document.createElementNS(ns, 'g')
      w.setAttribute('class', 'taiji-halo-boot')
      w.style.opacity = '0'
      h.parentNode?.insertBefore(w, h)
      w.appendChild(h)
    })

    const t1 = setTimeout(() => setHeroRightRevealed(true), 100)
    const t2 = setTimeout(() => setHeroLeftRevealed(true), 1500)

    // ===== Mouse Parallax =====
    const ringWrappers: SVGGElement[] = []
    for (let ri = 1; ri <= 7; ri++) {
      const r = document.querySelector(`.hr-${ri}`)
      if (r) {
        const wrapper = document.createElementNS(ns, 'g')
        r.parentNode?.insertBefore(wrapper, r)
        wrapper.appendChild(r)
        ringWrappers.push(wrapper)
      }
    }
    const tg = document.querySelector('.taiji-group')
    if (tg) {
      const wrapper = document.createElementNS(ns, 'g')
      tg.parentNode?.insertBefore(wrapper, tg)
      wrapper.appendChild(tg)
      ringWrappers.push(wrapper)
    }

    let targetX = 0, targetY = 0
    let currentX = 0, currentY = 0
    let rafId: number | null = null
    let isIdle = true
    const prevTransforms: string[] = []

    const onMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      targetX = (e.clientX - cx) / cx
      targetY = (e.clientY - cy) / cy

      if (isIdle) {
        isIdle = false
        rafId = requestAnimationFrame(parallaxLoop)
      }
    }

    const onMouseLeave = () => {
      targetX = 0
      targetY = 0
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)

    const parallaxLoop = () => {
      currentX += (targetX - currentX) * 0.06
      currentY += (targetY - currentY) * 0.06

      let changed = false
      ringWrappers.forEach((wr, i) => {
        const strength = 1 - i * 0.1
        const next = `translate(${(currentX * 26 * strength).toFixed(1)}, ${(currentY * 18 * strength).toFixed(1)})`
        if (next !== prevTransforms[i]) {
          wr.setAttribute('transform', next)
          prevTransforms[i] = next
          changed = true
        }
      })

      const isNearZero = Math.abs(currentX) < 0.001 && Math.abs(currentY) < 0.001
      if (isNearZero && targetX === 0 && targetY === 0) {
        isIdle = true
        rafId = null
        return
      }

      rafId = requestAnimationFrame(parallaxLoop)
    }

    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
      clearTimeout(t2)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <section className="hero">
        <div className={`hero-left${heroLeftRevealed ? ' revealed' : ''}`}>
          <div className="hero-tag">探索·创造·分享</div>
          <h1 className="hero-title">辉洋的博客</h1>
          <p className="hero-subtitle">Full-Stack Developer &amp; Creative Technologist</p>
          <p className="hero-desc">从代码到艺术。</p>
          <div className="hero-cta">
            <Link href="/blog" className="cta-primary">浏览文章</Link>
            <Link href="/projects" className="cta-secondary">查看作品</Link>
          </div>
        </div>

        <div className={`hero-right${heroRightRevealed ? ' revealed' : ''}`}>
          <div className="hero-right-inner" id="heroRightInner">
            <svg
              className="qimen-svg"
              viewBox="0 0 1600 900"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              <HeroRings />
              <AxialDots />
              <TaijiCenter />
            </svg>
          </div>
        </div>
      </section>
    </>
  )
}
