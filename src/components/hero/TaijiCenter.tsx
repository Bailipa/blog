'use client'

import * as React from 'react'

const CX = 1000
const CY = 450
const DEG_TO_RAD = Math.PI / 180

function TaijiCenter() {
  const innerRef = React.useRef<SVGGElement>(null)
  const outerRef = React.useRef<SVGGElement>(null)

  React.useEffect(() => {
    const innerGroup = innerRef.current
    const outerGroup = outerRef.current
    if (!innerGroup || !outerGroup) return

    const ns = 'http://www.w3.org/2000/svg'
    const innerParticles: {
      el: SVGCircleElement
      trailEls: SVGCircleElement[]
      trailOffsets: number[]
      orbitR: number
      angle: number
      speed: number
      index: number
    }[] = []
    const outerParticles: {
      el: SVGCircleElement
      trailEls: SVGCircleElement[]
      trailOffsets: number[]
      orbitR: number
      angle: number
      speed: number
      index: number
    }[] = []

    for (let i = 0; i < 16; i++) {
      const orbitR = 75 + Math.random() * 20
      const pRadius = 1.5 + Math.random() * 2
      const speed = (0.3 + Math.random() * 0.9) * DEG_TO_RAD
      const startAngle = Math.random() * Math.PI * 2

      const trailEls: SVGCircleElement[] = []
      for (let t = 0; t < 3; t++) {
        const tc = document.createElementNS(ns, 'circle')
        tc.setAttribute('r', String(pRadius * (1 - t * 0.2)))
        tc.setAttribute('fill', '#00d4ff')
        tc.setAttribute('opacity', '0')
        innerGroup.appendChild(tc)
        trailEls.push(tc)
      }

      const el = document.createElementNS(ns, 'circle')
      el.setAttribute('r', String(pRadius))
      el.setAttribute('fill', '#00d4ff')
      el.setAttribute('filter', 'url(#glow)')
      innerGroup.appendChild(el)

      const trailOffsets: number[] = []
      for (let t = 0; t < 3; t++) {
        trailOffsets.push((t + 1) * (3 + Math.random() * 2) * DEG_TO_RAD)
      }

      innerParticles.push({ el, trailEls, trailOffsets, orbitR, angle: startAngle, speed, index: i })
    }

    for (let i = 0; i < 28; i++) {
      const orbitR = 325 + Math.random() * 35
      const pRadius = 1 + Math.random() * 1.5
      const speed = (0.15 + Math.random() * 0.45) * DEG_TO_RAD * (Math.random() < 0.5 ? 1 : -1)
      const startAngle = Math.random() * Math.PI * 2
      const isGold = Math.random() < 0.15
      const color = isGold ? '#d4a017' : '#00d4ff'

      const trailEls: SVGCircleElement[] = []
      for (let t = 0; t < 3; t++) {
        const tc = document.createElementNS(ns, 'circle')
        tc.setAttribute('r', String(pRadius * (1 - t * 0.25)))
        tc.setAttribute('fill', color)
        tc.setAttribute('opacity', '0')
        outerGroup.appendChild(tc)
        trailEls.push(tc)
      }

      const el = document.createElementNS(ns, 'circle')
      el.setAttribute('r', String(pRadius))
      el.setAttribute('fill', color)
      el.setAttribute('filter', 'url(#glow)')
      outerGroup.appendChild(el)

      const trailOffsets: number[] = []
      for (let t = 0; t < 3; t++) {
        trailOffsets.push((t + 1) * (4 + Math.random() * 3) * DEG_TO_RAD)
      }

      outerParticles.push({ el, trailEls, trailOffsets, orbitR, angle: startAngle, speed, index: i })
    }

    let animId: number

    function animate(time: number) {
      for (const p of innerParticles) {
        p.angle += p.speed
        if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2

        const breathe = 0.5 + 0.5 * Math.sin(time * 0.003 + p.index)
        const mainX = CX + p.orbitR * Math.cos(p.angle)
        const mainY = CY + p.orbitR * Math.sin(p.angle)

        p.el.setAttribute('cx', String(mainX))
        p.el.setAttribute('cy', String(mainY))
        p.el.setAttribute('opacity', String(breathe))

        for (let t = 0; t < p.trailEls.length; t++) {
          const trailAngle = p.angle - p.trailOffsets[t]
          const tx = CX + p.orbitR * Math.cos(trailAngle)
          const ty = CY + p.orbitR * Math.sin(trailAngle)
          const trailAlpha = breathe * (0.3 - t * 0.08)
          p.trailEls[t].setAttribute('cx', String(tx))
          p.trailEls[t].setAttribute('cy', String(ty))
          p.trailEls[t].setAttribute('opacity', String(Math.max(0, trailAlpha)))
        }
      }

      for (const p of outerParticles) {
        p.angle += p.speed
        if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2
        if (p.angle < 0) p.angle += Math.PI * 2

        const breathe = 0.4 + 0.6 * Math.sin(time * 0.002 + p.index * 0.7)
        const mainX = CX + p.orbitR * Math.cos(p.angle)
        const mainY = CY + p.orbitR * Math.sin(p.angle)

        p.el.setAttribute('cx', String(mainX))
        p.el.setAttribute('cy', String(mainY))
        p.el.setAttribute('opacity', String(breathe))

        for (let t = 0; t < p.trailEls.length; t++) {
          const trailAngle = p.angle - p.trailOffsets[t] * Math.sign(p.speed)
          const tx = CX + p.orbitR * Math.cos(trailAngle)
          const ty = CY + p.orbitR * Math.sin(trailAngle)
          const trailAlpha = breathe * (0.25 - t * 0.07)
          p.trailEls[t].setAttribute('cx', String(tx))
          p.trailEls[t].setAttribute('cy', String(ty))
          p.trailEls[t].setAttribute('opacity', String(Math.max(0, trailAlpha)))
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <>
      <circle cx={CX} cy={CY} r={120} fill="url(#centerGlow)" filter="url(#glow-lg)" />
      <circle className="taiji-halo" cx={CX} cy={CY} r={60} fill="none" stroke="#00d4ff" strokeWidth={1.5} opacity={0.4} filter="url(#glow-md)" />
      <circle className="taiji-halo" cx={CX} cy={CY} r={72} fill="none" stroke="#3b82f6" strokeWidth={1} opacity={0.3} filter="url(#glow-md)" style={{ animationDelay: '1s' }} />
      <circle className="taiji-halo" cx={CX} cy={CY} r={85} fill="none" stroke="#7c3aed" strokeWidth={0.8} opacity={0.2} filter="url(#glow-md)" style={{ animationDelay: '2s' }} />
      <circle className="taiji-halo" cx={CX} cy={CY} r={100} fill="none" stroke="#00d4ff" strokeWidth={0.5} opacity={0.15} filter="url(#glow-md)" style={{ animationDelay: '3s' }} />
      <g className="taiji-group" filter="url(#taiji-glow)">
        <path d="M 1000 400 A 50 50 0 0 1 1000 500 Z" fill="#e2e8f0" />
        <path d="M 1000 400 A 50 50 0 0 0 1000 500 Z" fill="#050816" />
        <path d="M 1000 400 A 25 25 0 0 1 1000 450 Z" fill="#050816" />
        <path d="M 1000 450 A 25 25 0 0 0 1000 500 Z" fill="#e2e8f0" />
        <circle cx={CX} cy={425} r={6} fill="#e2e8f0" />
        <circle cx={CX} cy={475} r={6} fill="#050816" />
        <circle cx={CX} cy={CY} r={54} fill="none" stroke="#00d4ff" strokeWidth={1.5} opacity={0.6} />
        <circle cx={CX} cy={CY} r={58} fill="none" stroke="#00d4ff" strokeWidth={0.8} opacity={0.3} />
      </g>
      <g ref={innerRef} id="orbitParticles" />
      <g ref={outerRef} id="outerParticles" />
    </>
  )
}

export { TaijiCenter }
