'use client'

import { useEffect, useRef } from 'react'

const articles: Record<string, { tag: string; title: string; meta: string; content: string }> = {}

export function ArticleOverlay() {
  const inited = useRef(false)

  useEffect(() => {
    if (inited.current) return
    inited.current = true

    const overlay = document.getElementById('articleOverlay')
    const backdrop = document.getElementById('articleBackdrop')
    const closeBtn = document.getElementById('articleClose')
    const tagEl = document.getElementById('articleTag')
    const titleEl = document.getElementById('articleTitle')
    const metaEl = document.getElementById('articleMeta')
    const contentEl = document.getElementById('articleContent')

    const open = (tag: string, title: string, meta: string, content: string) => {
      if (tagEl) tagEl.textContent = tag
      if (titleEl) titleEl.textContent = title
      if (metaEl) metaEl.innerHTML = meta
      if (contentEl) contentEl.innerHTML = content
      overlay?.classList.add('active')
      document.body.style.overflow = 'hidden'
    }

    const close = () => {
      overlay?.classList.remove('active')
      document.body.style.overflow = ''
    }

    // post card clicks navigate directly (no overlay for posts)
    // only mumbles use the overlay
    document.querySelector('.mumbles-track')?.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest('.mumble-card')
      if (!card) return
      const t = '碎碎念'
      const desc = card.querySelector('p')?.textContent || ''
      const date = card.querySelector('.mumble-meta')?.textContent || ''
      open('随想', t, `<span>📅 ${date}</span>`, `<p>${desc}</p>`)
    })

    closeBtn?.addEventListener('click', close)
    backdrop?.addEventListener('click', close)
  }, [])

  return (
    <div className="article-overlay" id="articleOverlay">
      <div className="article-backdrop" id="articleBackdrop" />
      <div className="article-panel">
        <div className="article-header-deco" />
        <button className="article-close" id="articleClose">✕</button>
        <div className="article-scroll">
          <div className="article-tag" id="articleTag" />
          <h2 className="article-title" id="articleTitle" />
          <div className="article-meta" id="articleMeta" />
          <div className="article-divider" />
          <div className="article-content" id="articleContent" />
        </div>
      </div>
    </div>
  )
}
