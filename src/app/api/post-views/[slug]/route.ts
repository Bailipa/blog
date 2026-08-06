import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { apiErrorHandler } from '@/lib/apiErrorHandler'

export const runtime = 'nodejs'

// Increment a post's view count. Called client-side once per post visit
// (deduped by localStorage in the article page). Uses the slug from the
// URL so the public page doesn't need an extra id lookup.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true, status: true, viewCount: true },
    })
    if (!post || post.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const updated = await prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    })
    return NextResponse.json({ data: { viewCount: updated.viewCount } })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
