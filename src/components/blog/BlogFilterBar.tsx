'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type SortKey = 'newest' | 'oldest' | 'popular' | 'featured'
type PeriodKey = 'all' | 'week' | 'month' | 'year'
type ViewKey = 'grid' | 'list' | 'timeline'

const SORT_OPTIONS: Array<[SortKey, string]> = [
  ['newest', '最新'],
  ['oldest', '最早'],
  ['popular', '最多阅读'],
  ['featured', '精选优先'],
]

const PERIOD_OPTIONS: Array<[PeriodKey, string]> = [
  ['all', '全部'],
  ['week', '本周'],
  ['month', '本月'],
  ['year', '今年'],
]

const VIEW_OPTIONS: Array<[ViewKey, string, string]> = [
  ['grid', '网格', '⊞'],
  ['list', '列表', '☰'],
  ['timeline', '时间线', '⌁'],
]

interface CategoryOption {
  slug: string
  name: string
  count: number
}

interface Props {
  categories: CategoryOption[]
  total: number
  categoryCount: number
  tagCount: number
}

function paramFor(key: string, value: string, defaults: Record<string, string>): string | null {
  if (value === '' || value === defaults[key]) return null
  return value
}

export function BlogFilterBar({ categories, total, categoryCount, tagCount }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()

  const sort = (sp.get('sort') as SortKey) || 'newest'
  const category = sp.get('category') || 'all'
  const period = (sp.get('period') as PeriodKey) || 'all'
  const view = (sp.get('view') as ViewKey) || 'grid'
  const initialQ = sp.get('q') || ''

  const [q, setQ] = useState(initialQ)
  useEffect(() => {
    setQ(initialQ)
  }, [initialQ])

  const updateParams = useCallback(
    (next: Partial<Record<'sort' | 'category' | 'period' | 'view' | 'q', string>>) => {
      const params = new URLSearchParams(sp.toString())
      const defaults: Record<string, string> = { sort: 'newest', category: 'all', period: 'all', view: 'grid', q: '' }
      for (const [k, v] of Object.entries(next)) {
        const clean = paramFor(k, v, defaults)
        if (clean === null) params.delete(k)
        else params.set(k, clean)
      }
      params.delete('page')
      const qs = params.toString()
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [sp, pathname, router]
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ q })
  }

  const clearSearch = () => {
    setQ('')
    updateParams({ q: '' })
  }

  return (
    <div className={`blog-filter ${pending ? 'is-pending' : ''}`} role="region" aria-label="文章筛选">
      <div className="blog-filter-summary">
        <span className="blog-filter-stat">共 <strong>{total}</strong> 篇文章</span>
        <span className="blog-filter-sep" aria-hidden>·</span>
        <span className="blog-filter-stat"><strong>{categoryCount}</strong> 个分类</span>
        <span className="blog-filter-sep" aria-hidden>·</span>
        <span className="blog-filter-stat"><strong>{tagCount}</strong> 个标签</span>
      </div>

      <div className="blog-filter-row">
        <span className="blog-filter-label">排序</span>
        <div className="blog-filter-chips">
          {SORT_OPTIONS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`blog-filter-chip ${sort === k ? 'is-active' : ''}`}
              onClick={() => updateParams({ sort: k })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="blog-filter-row">
        <span className="blog-filter-label">分类</span>
        <div className="blog-filter-chips">
          <button
            type="button"
            className={`blog-filter-chip ${category === 'all' ? 'is-active' : ''}`}
            onClick={() => updateParams({ category: 'all' })}
          >
            全部
            <span className="blog-filter-chip-count">{total}</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              className={`blog-filter-chip ${category === cat.slug ? 'is-active' : ''}`}
              onClick={() => updateParams({ category: cat.slug })}
            >
              {cat.name}
              <span className="blog-filter-chip-count">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="blog-filter-row">
        <span className="blog-filter-label">时间</span>
        <div className="blog-filter-chips">
          {PERIOD_OPTIONS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`blog-filter-chip ${period === k ? 'is-active' : ''}`}
              onClick={() => updateParams({ period: k })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="blog-filter-row blog-filter-row--inline">
        <form onSubmit={handleSearch} className="blog-filter-search" role="search">
          <span className="blog-filter-search-icon" aria-hidden>🔍</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标题或摘要..."
            className="blog-filter-search-input"
            aria-label="搜索文章"
          />
          {q && (
            <button
              type="button"
              className="blog-filter-search-clear"
              onClick={clearSearch}
              aria-label="清除搜索"
            >
              ×
            </button>
          )}
          <button type="submit" className="blog-filter-search-submit" aria-label="提交搜索">
            搜索
          </button>
        </form>

        <div className="blog-filter-view" role="group" aria-label="视图切换">
          {VIEW_OPTIONS.map(([k, label, icon]) => (
            <button
              key={k}
              type="button"
              className={`blog-filter-view-btn ${view === k ? 'is-active' : ''}`}
              onClick={() => updateParams({ view: k })}
              title={label}
              aria-label={`切换到${label}视图`}
              aria-pressed={view === k}
            >
              <span className="blog-filter-view-icon">{icon}</span>
              <span className="blog-filter-view-label">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}