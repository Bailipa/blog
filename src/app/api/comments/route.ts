import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import {
  getBreaker,
  setBreaker,
  hashIp,
  sanitizeComment,
  getRequestIp,
  COMMENT_GLOBAL_RATE_THRESHOLD,
  COMMENT_GLOBAL_RATE_WINDOW_MS,
  COMMENT_IP_RATE_MAX,
  COMMENT_IP_RATE_WINDOW_MS,
} from '@/lib/comments'
import { checkRateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postSlug = searchParams.get('postSlug')
    if (!postSlug) {
      return NextResponse.json({ error: 'postSlug required' }, { status: 400 })
    }
    const post = await prisma.post.findUnique({
      where: { slug: postSlug },
      select: { id: true, status: true },
    })
    if (!post || post.status !== 'PUBLISHED') {
      return NextResponse.json({ data: [] })
    }
    const comments = await prisma.comment.findMany({
      where: { postId: post.id, status: 'VISIBLE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, content: true, createdAt: true },
    })
    return NextResponse.json({ data: comments })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const content = sanitizeComment(body.content)
    const postSlug = typeof body.postSlug === 'string' ? body.postSlug.trim() : ''
    if (!content || !postSlug) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    const post = await prisma.post.findUnique({
      where: { slug: postSlug },
      select: { id: true, status: true },
    })
    if (!post || post.status !== 'PUBLISHED') {
      return NextResponse.json({ error: '文章不存在或未发布' }, { status: 404 })
    }

    const session = await auth()
    const authorId = session?.user?.id ?? null

    const ip = getRequestIp(req)
    const salt = process.env.NEXTAUTH_SECRET ?? 'fallback-salt'
    const ipHash = hashIp(ip, salt)

    const ipLimit = checkRateLimit(`comment:ip:${ipHash}`, COMMENT_IP_RATE_MAX, COMMENT_IP_RATE_WINDOW_MS)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: '你的提交过于频繁，稍后再试。' },
        { status: 429 },
      )
    }

    const breaker = await getBreaker(prisma)
    const status = breaker.open ? 'HIDDEN' : 'VISIBLE'

    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        content,
        status,
        authorId,
        ipHash,
      },
      select: { id: true, status: true, createdAt: true },
    })

    const since = new Date(Date.now() - COMMENT_GLOBAL_RATE_WINDOW_MS)
    const recent = await prisma.comment.count({ where: { createdAt: { gte: since } } })
    if (recent >= COMMENT_GLOBAL_RATE_THRESHOLD && !breaker.open) {
      await setBreaker(prisma, {
        open: true,
        reason: 'auto',
        trippedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}