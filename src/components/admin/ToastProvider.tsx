'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { ToastBar } from '@/components/ui/Toast'
import type { Toast } from '@/hooks/useToast'

interface ToastCtx {
  show: (message: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastCtx>({ show: () => {} })

export function useAdminToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastBar toast={toast} />
    </ToastContext.Provider>
  )
}
