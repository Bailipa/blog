'use client'

import { useState } from 'react'

interface ShareButtonsProps {
  title: string
  url: string
}

// Post share buttons: native Web Share API when available (mobile),
// otherwise copy-link + X/Twitter + Weibo deep links. No external libs.
export function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — fall back to selecting the URL.
      const a = document.createElement('a')
      a.href = url
      a.textContent = url
      document.body.appendChild(a)
      const range = document.createRange()
      range.selectNodeContents(a)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      a.remove()
    }
  }

  const onNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await onCopy()
      }
    } catch {
      // User cancelled or share unavailable.
    }
  }

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  const weiboUrl = `https://service.weibo.com/share/share.php?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`

  return (
    <div className="share-buttons">
      <button type="button" className="share-btn share-btn-copy" onClick={onCopy} aria-label="复制链接">
        {copied ? '已复制 ✓' : '复制链接'}
      </button>
      <button type="button" className="share-btn share-btn-native" onClick={onNativeShare} aria-label="分享">
        分享
      </button>
      <a className="share-btn share-btn-x" href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="分享到 X">
        X
      </a>
      <a className="share-btn share-btn-weibo" href={weiboUrl} target="_blank" rel="noopener noreferrer" aria-label="分享到微博">
        微博
      </a>
    </div>
  )
}
