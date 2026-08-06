'use client'

import { useCallback, useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'

interface AvatarCropperProps {
  file: File
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

const CROP_SIZE = 320

// Crop an image to a square avatar before upload. Shows a modal with
// react-easy-crop (drag to position, wheel/pinch to zoom), then draws the
// cropped region to a square canvas and hands back the resulting Blob so
// the caller can upload it. Handles arbitrary input sizes/formats.
export function AvatarCropper({ file, onCancel, onConfirm }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [imgSrc, setImgSrc] = useState<string>('')

  useEffect(() => {
    // Read the selected file into a data URL for the cropper.
    const reader = new FileReader()
    reader.onload = () => setImgSrc(reader.result as string)
    reader.readAsDataURL(file)
  }, [file])

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const confirm = async () => {
    if (!croppedAreaPixels || !imgSrc) return
    try {
      const img = await loadImage(imgSrc)
      const canvas = document.createElement('canvas')
      canvas.width = CROP_SIZE
      canvas.height = CROP_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        CROP_SIZE,
        CROP_SIZE,
      )
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.9),
      )
      if (blob) onConfirm(blob)
    } catch {
      // fall through, caller shows error
    }
  }

  return (
    <div className="avatar-crop-backdrop" role="dialog" aria-modal="true" aria-label="裁切头像">
      <div className="avatar-crop-panel">
        <h3 className="avatar-crop-title">调整头像</h3>
        <p className="avatar-crop-sub">拖动调整位置，滚轮 / 双指缩放</p>
        <div className="avatar-crop-area">
          {imgSrc ? (
            <Cropper
              image={imgSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : (
            <p className="avatar-crop-loading">加载图片…</p>
          )}
        </div>
        <div className="avatar-crop-zoom">
          <span>缩略</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="缩放"
          />
          <span>放大</span>
        </div>
        <div className="avatar-crop-actions">
          <button type="button" className="onboarding-btn-link" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="onboarding-btn-secondary" onClick={confirm}>
            确认裁切
          </button>
        </div>
      </div>
    </div>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
