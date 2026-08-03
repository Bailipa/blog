'use client'

import { useEffect, useRef, useState } from 'react'

interface YearGroup {
  year: number
  total: number
  months: { year: number; month: number; posts: unknown[] }[]
}

interface Props {
  years: YearGroup[]
}

type Active = { kind: 'year'; year: number } | { kind: 'month'; year: number; month: number } | null

export function ArchiveTimeline({ years }: Props) {
  const [active, setActive] = useState<Active>(null)
  const scheduled = useRef(false)
  const yearEls = useRef<{ year: number; el: HTMLElement }[]>([])
  const monthEls = useRef<{ year: number; month: number; el: HTMLElement }[]>([])

  useEffect(() => {
    yearEls.current = []
    monthEls.current = []
    document.querySelectorAll<HTMLElement>('.archive-year').forEach((el) => {
      const y = Number(el.id.replace('year-', ''))
      if (!Number.isNaN(y)) yearEls.current.push({ year: y, el })
    })
    document.querySelectorAll<HTMLElement>('.archive-month').forEach((el) => {
      const id = el.id.replace('ym-', '')
      const [y, m] = id.split('-').map(Number)
      if (!Number.isNaN(y) && !Number.isNaN(m)) monthEls.current.push({ year: y, month: m, el })
    })

    const compute = () => {
      scheduled.current = false
      const offset = 120
      let nextMonth: { year: number; month: number; el: HTMLElement } | null = null
      let nextYear: { year: number; el: HTMLElement } | null = null
      for (const m of monthEls.current) {
        const top = m.el.getBoundingClientRect().top
        if (top - offset <= 0) nextMonth = m
      }
      for (const y of yearEls.current) {
        const top = y.el.getBoundingClientRect().top
        if (top - offset <= 0) nextYear = y
      }
      if (nextMonth) setActive({ kind: 'month', year: nextMonth.year, month: nextMonth.month })
      else if (nextYear) setActive({ kind: 'year', year: nextYear.year })
    }

    const schedule = () => {
      if (scheduled.current) return
      scheduled.current = true
      requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [years])

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (!target) return
    const top = target.getBoundingClientRect().top + window.scrollY - 100
    window.scrollTo({ top, behavior: 'smooth' })
    history.replaceState(null, '', `#${id}`)
  }

  return (
    <aside className="archive-timeline" aria-label="归档时间线">
      <div className="archive-timeline-inner">
        <h2 className="archive-timeline-title">时间</h2>
        <ul className="archive-timeline-list">
          {years.map((yg) => {
            const isYearActive = active?.kind === 'year' && active.year === yg.year
            return (
              <li key={yg.year} className={`archive-timeline-year ${isYearActive ? 'is-active' : ''}`}>
                <a href={`#year-${yg.year}`} onClick={(e) => handleAnchor(e, `year-${yg.year}`)} className="archive-timeline-year-link">
                  <span className="archive-timeline-year-num">{yg.year}</span>
                  <span className="archive-timeline-year-count">{yg.total}</span>
                </a>
                <ul className="archive-timeline-month-list">
                  {yg.months.map((mg) => {
                    const isMonthActive = active?.kind === 'month' && active.year === yg.year && active.month === mg.month
                    return (
                      <li key={`${yg.year}-${mg.month}`} className={isMonthActive ? 'is-active' : ''}>
                        <a
                          href={`#ym-${yg.year}-${mg.month}`}
                          onClick={(e) => handleAnchor(e, `ym-${yg.year}-${mg.month}`)}
                          className="archive-timeline-month-link"
                        >
                          {String(mg.month).padStart(2, '0')} 月
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}