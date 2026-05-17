import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import Fuse from 'fuse.js'
import { apiErrorHandler } from '@/lib/apiErrorHandler'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()
    if (!q) return NextResponse.json({ data: [] })

    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, slug: true, excerpt: true, content: true },
    })

    const fuse = new Fuse(posts, {
      keys: ['title', 'excerpt', 'content'],
      threshold: 0.3,
      includeMatches: true,
    })

    const results = fuse.search(q).slice(0, 20)
    return NextResponse.json({
      data: results.map((r) => ({ ...r.item, matches: r.matches })),
    })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
