import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAdmin'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { getBreaker } from '@/lib/comments'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
    const status = searchParams.get('status')
    const postId = searchParams.get('postId')

    const where: Record<string, unknown> = {}
    if (status === 'VISIBLE' || status === 'HIDDEN') where.status = status
    if (postId) where.postId = postId

    const [comments, total, breaker] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          postId: true,
          ipHash: true,
          authorId: true,
          authorName: true,
          authorAvatar: true,
          post: { select: { slug: true, title: true } },
        },
      }),
      prisma.comment.count({ where }),
      getBreaker(prisma),
    ])

    return NextResponse.json({
      data: comments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      breaker,
    })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}