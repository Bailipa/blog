'use client'

import { useEffect, useRef, useState } from 'react'

// Client-side enhancer: finds every <pre> in the rendered article and
// adds a hover-revealed copy button. Mimics labuladong's two-icon pattern
// (Copy + Ask AI); AI button is a no-op placeholder for now.
//
// We do this here rather than in the markdown pipeline because:
//  - markdownToHtml runs server-side, can't attach event handlers
//  - re-running remark/rehype on every render is wasteful
//  - the existing CSS already targets `.markdown-body pre` so styling is stable
export function CodeEnhancer() {
  useEffect(() => {
    const pres = document.querySelectorAll<HTMLPreElement>('.markdown-body pre')
    const cleanups: Array<() => void> = []

    pres.forEach((pre) => {
      if (pre.dataset.enhanced === '1') return
      pre.dataset.enhanced = '1'
      pre.classList.add('code-block')

      const wrap = document.createElement('div')
      wrap.className = 'code-block-wrap'
      pre.parentNode?.insertBefore(wrap, pre)
      wrap.appendChild(pre)

      // Language label from the first code block's class, e.g. language-ts
      const codeEl = pre.querySelector('code')
      const langMatch = codeEl?.className?.match(/language-([\w+-]+)/)
      const lang = langMatch ? langMatch[1] : ''
      if (lang) {
        const label = document.createElement('span')
        label.className = 'code-block-lang'
        label.textContent = lang
        wrap.appendChild(label)
      }

      const copyBtn = document.createElement('button')
      copyBtn.type = 'button'
      copyBtn.className = 'code-block-btn code-block-btn-copy'
      copyBtn.setAttribute('aria-label', '复制代码')
      copyBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'

      const aiBtn = document.createElement('button')
      aiBtn.type = 'button'
      aiBtn.className = 'code-block-btn code-block-btn-ai'
      aiBtn.setAttribute('aria-label', '问 AI')
      aiBtn.disabled = true
      aiBtn.title = 'AI 助教（即将上线）'
      aiBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 14l.8 1.9 1.9.8-1.9.8L19 19l-.8-1.9-1.9-.8 1.9-.8z"/></svg>'

      const onCopy = async () => {
        const code = pre.querySelector('code')?.innerText ?? pre.innerText
        try {
          await navigator.clipboard.writeText(code)
          copyBtn.classList.add('copied')
          copyBtn.setAttribute('aria-label', '已复制')
          setTimeout(() => {
            copyBtn.classList.remove('copied')
            copyBtn.setAttribute('aria-label', '复制代码')
          }, 1500)
        } catch {
          // Fallback: select text
          const range = document.createRange()
          range.selectNodeContents(pre)
          const sel = window.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      }
      copyBtn.addEventListener('click', onCopy)

      wrap.appendChild(copyBtn)
      wrap.appendChild(aiBtn)

      cleanups.push(() => {
        copyBtn.removeEventListener('click', onCopy)
        // Move pre back to original parent and remove wrap
        if (pre.parentNode === wrap) {
          wrap.parentNode?.insertBefore(pre, wrap)
        }
        wrap.remove()
        pre.classList.remove('code-block')
        delete pre.dataset.enhanced
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return null
}
