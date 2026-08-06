'use client'

import * as React from 'react'

const CX = 1000
const CY = 450

const GOLD_BRIGHT = '#f5c71a'
const GOLD_MID = '#d4a017'
const TEXT_LIGHT = '#e2e8f0'

const xiantian = [
  { yao: [1, 1, 1] as const, name: '乾', symbol: '☰', desc: '创始之力，刚健不息，天行健君子以自强不息' },
  { yao: [1, 1, 0] as const, name: '兑', symbol: '☱', desc: '悦纳包容，感化万物，丽泽兑君子以朋友讲习' },
  { yao: [1, 0, 1] as const, name: '离', symbol: '☲', desc: '光明依附，文明之象，明两作离大人以继明照于四方' },
  { yao: [1, 0, 0] as const, name: '震', symbol: '☳', desc: '震动奋起，万物萌发，洊雷震君子以恐惧修省' },
  { yao: [0, 1, 1] as const, name: '巽', symbol: '☴', desc: '渗透柔顺，无处不入，随风巽君子以申命行事' },
  { yao: [0, 1, 0] as const, name: '坎', symbol: '☵', desc: '险陷重重，以柔克刚，水洊至习坎君子以常德行习教事' },
  { yao: [0, 0, 1] as const, name: '艮', symbol: '☶', desc: '静止守成，知止不殆，兼山艮君子以思不出其位' },
  { yao: [0, 0, 0] as const, name: '坤', symbol: '☷', desc: '厚德载物，柔顺包容，地势坤君子以厚德载物' },
]

const houtian = [
  { yao: [1, 0, 1] as const, name: '离', symbol: '☲', desc: '光明文采，南方之位，明两作离大人以继明照于四方' },
  { yao: [0, 0, 0] as const, name: '坤', symbol: '☷', desc: '万物致养，西南之位，地势坤君子以厚德载物' },
  { yao: [1, 1, 0] as const, name: '兑', symbol: '☱', desc: '悦言口舌，西方之位，丽泽兑君子以朋友讲习' },
  { yao: [1, 1, 1] as const, name: '乾', symbol: '☰', desc: '君父刚健，西北之位，天行健君子以自强不息' },
  { yao: [0, 1, 0] as const, name: '坎', symbol: '☵', desc: '劳卦之象，北方之位，水洊至习坎君子以常德行习教事' },
  { yao: [0, 0, 1] as const, name: '艮', symbol: '☶', desc: '成终成始，东北之位，兼山艮君子以思不出其位' },
  { yao: [1, 0, 0] as const, name: '震', symbol: '☳', desc: '出震万物，东方之位，洊雷震君子以恐惧修省' },
  { yao: [0, 1, 1] as const, name: '巽', symbol: '☴', desc: '齐乎巽，东南之位，随风巽君子以申命行事' },
]

const r3 = (n: number) => Number(n.toFixed(3))

function yaoArc(r: number, a1Deg: number, a2Deg: number) {
  const a1 = (a1Deg * Math.PI) / 180
  const a2 = (a2Deg * Math.PI) / 180
  return `M ${r3(CX + r * Math.cos(a1))} ${r3(CY + r * Math.sin(a1))} A ${r} ${r} 0 0 1 ${r3(CX + r * Math.cos(a2))} ${r3(CY + r * Math.sin(a2))}`
}

function Trigram({
  radius,
  yaoLines,
  angleDeg,
  offset = 7,
  name,
  symbol,
  desc,
}: {
  radius: number
  yaoLines: readonly number[]
  angleDeg: number
  offset?: number
  name?: string
  symbol?: string
  desc?: string
}) {
  const sw = offset > 6 ? 5 : 3
  const offsets = [offset, 0, -offset]

  return (
    <g data-name={name} data-symbol={symbol} data-desc={desc}>
      {offsets.map((off, i) => {
        const r = radius + off
        if (yaoLines[i] === 1) {
          return (
            <path
              key={i}
              fill="none"
              stroke="url(#yaoGrad)"
              strokeWidth={sw}
              strokeLinecap="round"
              className="yao-stroke"
              style={{ opacity: 0 }}
              d={yaoArc(r, angleDeg - 20, angleDeg + 20)}
            />
          )
        }
        return (
          <path
            key={i}
            fill="none"
            stroke="url(#yaoGrad)"
            strokeWidth={sw}
            strokeLinecap="round"
            className="yao-stroke"
            style={{ opacity: 0 }}
            d={`${yaoArc(r, angleDeg - 20, angleDeg - 2)} ${yaoArc(r, angleDeg + 2, angleDeg + 20)}`}
          />
        )
      })}
    </g>
  )
}

function RingDividers({
  count,
  innerR,
  outerR,
  cw,
}: {
  count: number
  innerR: number
  outerR: number
  cw: boolean
}) {
  const stepDeg = 360 / count
  const nodes: React.ReactNode[] = []

  for (let i = 0; i < count; i++) {
    let midDeg = -90 + (i + 0.5) * stepDeg
    if (!cw) midDeg = -90 - (i + 0.5) * stepDeg
    const midRad = (midDeg * Math.PI) / 180
    nodes.push(
      <line
        key={i}
        x1={r3(CX + innerR * Math.cos(midRad))}
        y1={r3(CY + innerR * Math.sin(midRad))}
        x2={r3(CX + outerR * Math.cos(midRad))}
        y2={r3(CY + outerR * Math.sin(midRad))}
        stroke={GOLD_BRIGHT}
        strokeWidth={1.5}
        opacity={0.7}
        style={{ opacity: 0 }}
      />,
    )
  }

  return <>{nodes}</>
}

function TextLayer({
  radius,
  chars,
  size,
  cw,
}: {
  radius: number
  chars: string
  size: number
  cw: boolean
}) {
  const startAngle = -Math.PI / 2
  const count = chars.length
  const step = (2 * Math.PI) / count
  const nodes: React.ReactNode[] = []

  for (let i = 0; i < count; i++) {
    const angle = startAngle + (cw ? 1 : -1) * i * step
    const x = CX + radius * Math.cos(angle)
    const y = CY + radius * Math.sin(angle)
    const baseAngle = (angle * 180) / Math.PI
    const rot = cw ? baseAngle - 90 : baseAngle + 90

    nodes.push(
        <g key={i} transform={`translate(${r3(x)},${r3(y)}) rotate(${r3(rot)})`}>
        <text
          fontSize={size}
          fill={GOLD_BRIGHT}
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ opacity: 0 }}
        >
          {chars[i]}
        </text>
      </g>,
    )
  }

  return <>{nodes}</>
}

function HeroRings() {
  return (
    <>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-md" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-lg" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="taiji-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="nebulaGrad" cx="65%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0b2e" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#050816" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={GOLD_BRIGHT} stopOpacity={0.35} />
          <stop offset="40%" stopColor={GOLD_MID} stopOpacity={0.15} />
          <stop offset="100%" stopColor="#050816" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="yaoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={GOLD_BRIGHT} stopOpacity={0.5} />
          <stop offset="50%" stopColor={GOLD_BRIGHT} stopOpacity={1} />
          <stop offset="100%" stopColor={GOLD_BRIGHT} stopOpacity={0.5} />
        </linearGradient>
        <radialGradient id="particleGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={TEXT_LIGHT} stopOpacity={1} />
          <stop offset="100%" stopColor={TEXT_LIGHT} stopOpacity={0} />
        </radialGradient>
      </defs>

      <ellipse cx={1050} cy={420} rx={450} ry={350} fill="url(#nebulaGrad)" />

      <g opacity={0.08}>
        <line x1={CX} y1={CY} x2={CX} y2={50} stroke={GOLD_BRIGHT} strokeWidth={2} />
        <line x1={CX} y1={CY} x2={1433} y2={200} stroke={GOLD_BRIGHT} strokeWidth={1.5} />
        <line x1={CX} y1={CY} x2={1550} y2={CY} stroke={GOLD_BRIGHT} strokeWidth={2} />
        <line x1={CX} y1={CY} x2={1433} y2={700} stroke={GOLD_BRIGHT} strokeWidth={1.5} />
        <line x1={CX} y1={CY} x2={CX} y2={850} stroke={GOLD_BRIGHT} strokeWidth={2} />
        <line x1={CX} y1={CY} x2={567} y2={700} stroke={GOLD_BRIGHT} strokeWidth={1.5} />
        <line x1={CX} y1={CY} x2={450} y2={CY} stroke={GOLD_BRIGHT} strokeWidth={2} />
        <line x1={CX} y1={CY} x2={567} y2={200} stroke={GOLD_BRIGHT} strokeWidth={1.5} />
        <line x1={CX} y1={CY} x2={1280} y2={100} stroke={GOLD_BRIGHT} strokeWidth={0.8} />
        <line x1={CX} y1={CY} x2={1500} y2={250} stroke={GOLD_BRIGHT} strokeWidth={0.8} />
        <line x1={CX} y1={CY} x2={1500} y2={650} stroke={GOLD_BRIGHT} strokeWidth={0.8} />
        <line x1={CX} y1={CY} x2={1280} y2={800} stroke={GOLD_BRIGHT} strokeWidth={0.8} />
      </g>

      <circle cx={CX} cy={CY} r={340} fill="none" stroke={GOLD_BRIGHT} strokeWidth={0.5} opacity={0.15} />
      <circle cx={CX} cy={CY} r={355} fill="none" stroke={GOLD_BRIGHT} strokeWidth={0.4} opacity={0.12} />
      <circle cx={CX} cy={CY} r={370} fill="none" stroke={GOLD_BRIGHT} strokeWidth={0.35} opacity={0.09} />
      <circle cx={CX} cy={CY} r={385} fill="none" stroke={GOLD_BRIGHT} strokeWidth={0.3} opacity={0.06} />
      <circle cx={CX} cy={CY} r={400} fill="none" stroke={GOLD_BRIGHT} strokeWidth={0.25} opacity={0.03} />

      <g className="hr-5" opacity={0.08}>
        <path d="M 1000 450 L 920 100 L 1080 100 Z" fill="url(#centerGlow)" />
        <path d="M 1000 450 L 1350 370 L 1350 530 Z" fill="url(#centerGlow)" />
        <path d="M 1000 450 L 1080 800 L 920 800 Z" fill="url(#centerGlow)" />
        <path d="M 1000 450 L 650 530 L 650 370 Z" fill="url(#centerGlow)" />
      </g>

      <g filter="url(#glow)" className="breathe-group">
        <circle cx={CX} cy={CY} r={320} fill="none" stroke={GOLD_BRIGHT} strokeWidth={3.5} opacity={0.7} className="breathe-1" />
        <circle cx={CX} cy={CY} r={280} fill="none" stroke={GOLD_BRIGHT} strokeWidth={2.2} opacity={0.6} className="breathe-2" />
        <circle cx={CX} cy={CY} r={245} fill="none" stroke={GOLD_BRIGHT} strokeWidth={1.8} opacity={0.55} className="breathe-3" />
        <circle cx={CX} cy={CY} r={215} fill="none" stroke={GOLD_BRIGHT} strokeWidth={3.0} opacity={0.5} className="breathe-4" />
        <circle cx={CX} cy={CY} r={190} fill="none" stroke={GOLD_BRIGHT} strokeWidth={1.5} opacity={0.45} className="breathe-5" />
        <circle cx={CX} cy={CY} r={160} fill="none" stroke={GOLD_BRIGHT} strokeWidth={1.2} opacity={0.4} className="breathe-6" />
        <circle cx={CX} cy={CY} r={135} fill="none" stroke={GOLD_BRIGHT} strokeWidth={0.9} opacity={0.35} className="breathe-7" />
      </g>

      <g filter="url(#glow)" opacity={0.7}>
        <circle cx={CX} cy={130} r={3.5} fill={GOLD_BRIGHT} />
        <circle cx={1320} cy={CY} r={3.5} fill={GOLD_BRIGHT} />
        <circle cx={CX} cy={770} r={3.5} fill={GOLD_BRIGHT} />
        <circle cx={680} cy={CY} r={3.5} fill={GOLD_BRIGHT} />
        <circle cx={CX} cy={170} r={3} fill={GOLD_BRIGHT} />
        <circle cx={1280} cy={CY} r={3} fill={GOLD_BRIGHT} />
        <circle cx={CX} cy={730} r={3} fill={GOLD_BRIGHT} />
        <circle cx={720} cy={CY} r={3} fill={GOLD_BRIGHT} />
        <circle cx={CX} cy={210} r={2.5} fill={GOLD_BRIGHT} />
        <circle cx={1240} cy={CY} r={2.5} fill={GOLD_BRIGHT} />
        <circle cx={CX} cy={690} r={2.5} fill={GOLD_BRIGHT} />
        <circle cx={760} cy={CY} r={2.5} fill={GOLD_BRIGHT} />
        <circle cx={1226} cy={224} r={2} fill={GOLD_BRIGHT} opacity={0.5} />
        <circle cx={1226} cy={676} r={2} fill={GOLD_BRIGHT} opacity={0.5} />
        <circle cx={774} cy={676} r={2} fill={GOLD_BRIGHT} opacity={0.5} />
        <circle cx={774} cy={224} r={2} fill={GOLD_BRIGHT} opacity={0.5} />
      </g>


      <g className="hr-1" filter="url(#glow)">
        {xiantian.map((t, i) => (
          <Trigram
            key={i}
            radius={335}
            yaoLines={t.yao}
            angleDeg={-90 + i * 45}
            offset={7}
            name={t.name}
            symbol={t.symbol}
            desc={t.desc}
          />
        ))}
        <RingDividers count={8} innerR={310} outerR={340} cw={true} />
      </g>

      <g className="hr-2" filter="url(#glow)">
        <TextLayer radius={300} chars="子丑寅卯辰巳午未申酉戌亥" size={16} cw={false} />
        <RingDividers count={12} innerR={281.25} outerR={310} cw={false} />
      </g>

      <g className="hr-3" filter="url(#glow)">
        <TextLayer radius={262.5} chars="甲乙丙丁戊己庚辛壬癸" size={15} cw={true} />
        <RingDividers count={10} innerR={238.75} outerR={281.25} cw={true} />
      </g>

      <g className="hr-4">
        {houtian.map((t, i) => (
          <Trigram
            key={i}
            radius={228}
            yaoLines={t.yao}
            angleDeg={-90 + i * 45}
            offset={4}
            name={t.name}
            symbol={t.symbol}
            desc={t.desc}
          />
        ))}
        <RingDividers count={8} innerR={208.75} outerR={238.75} cw={false} />
      </g>

      <g className="hr-5" filter="url(#glow)">
        <TextLayer radius={202.5} chars="蓬任冲辅英芮柱心禽" size={14} cw={true} />
        <RingDividers count={9} innerR={188.75} outerR={208.75} cw={true} />
      </g>

      <g className="hr-6" filter="url(#glow)">
        <TextLayer radius={175} chars="休生伤杜景死惊开" size={13} cw={false} />
        <RingDividers count={8} innerR={161.25} outerR={188.75} cw={false} />
      </g>

      <g className="hr-7" filter="url(#glow)">
        <TextLayer radius={147.5} chars="符蛇阴合虎玄地天" size={12} cw={true} />
        <RingDividers count={8} innerR={130} outerR={161.25} cw={true} />
      </g>
    </>
  )
}

export { HeroRings }
