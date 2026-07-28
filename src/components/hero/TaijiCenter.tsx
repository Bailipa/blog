'use client'

import * as React from 'react'

const CX = 1000
const CY = 450

function TaijiCenter() {
  const innerRef = React.useRef<SVGGElement>(null)
  const outerRef = React.useRef<SVGGElement>(null)

  React.useEffect(() => {
    const innerGroup = innerRef.current
    const outerGroup = outerRef.current
    if (!innerGroup || !outerGroup) return

    const ns = 'http://www.w3.org/2000/svg'

    for (let i = 0; i < 8; i++) {
      const orbitR = 75 + Math.random() * 20
      const pRadius = 1.5 + Math.random() * 2
      const startAngle = Math.random() * Math.PI * 2
      const px = CX + orbitR * Math.cos(startAngle)
      const py = CY + orbitR * Math.sin(startAngle)

      const el = document.createElementNS(ns, 'circle')
      el.setAttribute('cx', String(px))
      el.setAttribute('cy', String(py))
      el.setAttribute('r', String(pRadius))
      el.setAttribute('fill', '#00d4ff')
      innerGroup.appendChild(el)
    }

    for (let i = 0; i < 12; i++) {
      const orbitR = 325 + Math.random() * 35
      const pRadius = 1 + Math.random() * 1.5
      const startAngle = Math.random() * Math.PI * 2
      const isGold = Math.random() < 0.15
      const color = isGold ? '#d4a017' : '#00d4ff'
      const px = CX + orbitR * Math.cos(startAngle)
      const py = CY + orbitR * Math.sin(startAngle)

      const el = document.createElementNS(ns, 'circle')
      el.setAttribute('cx', String(px))
      el.setAttribute('cy', String(py))
      el.setAttribute('r', String(pRadius))
      el.setAttribute('fill', color)
      outerGroup.appendChild(el)
    }
  }, [])

  return (
    <>
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
      <g ref={innerRef} id="orbitParticles" filter="url(#glow)" />
      <g ref={outerRef} id="outerParticles" filter="url(#glow)" />
    </>
  )
}

export { TaijiCenter }
