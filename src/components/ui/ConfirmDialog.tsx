'use client'

import { useEffect, useRef } from 'react'

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!ref.current) return
    if (open) ref.current.showModal()
    else ref.current.close()
  }, [open])

  return (
    <dialog ref={ref} className="confirm-dialog" onClick={(e) => { if (e.target === ref.current) onCancel() }}>
      <div className="confirm-dialog-box">
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-btn confirm-dialog-cancel" onClick={onCancel}>取消</button>
          <button className="confirm-dialog-btn confirm-dialog-confirm" onClick={onConfirm}>确定</button>
        </div>
      </div>
    </dialog>
  )
}
