import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: { title: true, slug: true, excerpt: true, publishedAt: true },
  })

  const items = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      <pubDate>${post.publishedAt?.toUTCString() || ''}</pubDate>
      <guid>${baseUrl}/blog/${post.slug}</guid>
    </item>`,
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Lee's Blog</title>
    <link>${baseUrl}</link>
    <description>辉洋的博客 — 探索·创造·分享</description>
    <language>zh-CN</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
