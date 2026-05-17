import type { Toast } from '@/hooks/useToast'

export function ToastBar({ toast }: { toast: Toast | null }) {
  if (!toast) return null

  return (
    <div className={`toast-bar toast-${toast.type}`}>
      {toast.message}
    </div>
  )
}
