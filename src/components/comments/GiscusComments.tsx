'use client'

import { useTheme } from 'next-themes'
import Giscus from '@giscus/react'

export function GiscusComments({ slug }: { slug: string }) {
  const { resolvedTheme } = useTheme()

  return (
    <Giscus
      repo="Bailipa/blog"
      repoId="R_kgDOSU0lqw"
      category="Show and tell"
      categoryId="DIC_kwDOSU0lqw4C9Hp8"
      mapping="pathname"
      term={slug}
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      lang="zh-CN"
      loading="lazy"
    />
  )
}
