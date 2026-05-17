'use client'

import { useState, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'

export function useSearch<T>(items: T[], keys: string[], threshold = 0.3) {
  const [query, setQuery] = useState('')

  const fuse = useMemo(
    () => new Fuse(items, { keys, threshold, includeMatches: true }),
    [items, keys, threshold],
  )

  const results = useMemo(() => {
    if (!query.trim()) return items.map((item) => ({ item, matches: [] }))
    return fuse.search(query)
  }, [fuse, query, items])

  const search = useCallback((q: string) => setQuery(q), [])

  return { query, search, results }
}
