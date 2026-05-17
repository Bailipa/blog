'use client'

import { useState, useCallback, useRef } from 'react'

export interface Toast {
  message: string
  type: 'success' | 'error'
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ message, type })
    timer.current = setTimeout(() => setToast(null), 2500)
  }, [])

  return { toast, show }
}
