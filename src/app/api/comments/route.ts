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
import { gravatarUrlFor } from '@/lib/username'

export const runtime = 'nodejs'

// GET — public list of VISIBLE comments for a post. Includes a normalized
// `author` block so the client can render user identity (or "匿名访客" for
// legacy anonymous comments from before login-required cutover).
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
    const rows = await prisma.comment.findMany({
      where: { postId: post.id, status: 'VISIBLE' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
        authorName: true,
        authorAvatar: true,
      },
    })
    const data = rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt,
      author: r.authorId
        ? {
            userId: r.authorId,
            authorName: r.authorName,
            authorAvatar: r.authorAvatar,
            isLegacy: false,
          }
        : null,
    }))
    return NextResponse.json({ data })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

// POST — require authenticated user with a username (post-onboarding).
// Snapshots author name + avatar so username changes / account deletions
// don't rewrite history.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请登录后再评论' },
        { status: 401 },
      )
    }

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

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        onboarded: true,
        deletedAt: true,
      },
    })
    if (!me || me.deletedAt) {
      return NextResponse.json({ error: '账号不可用' }, { status: 403 })
    }
    if (!me.onboarded || !me.username) {
      return NextResponse.json(
        { error: '请先完善个人资料（设置用户名）' },
        { status: 403 },
      )
    }

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

    // Snapshot author identity at comment time
    const authorAvatar = me.avatarUrl ?? gravatarUrlFor(null, 80)

    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        content,
        status,
        authorId: me.id,
        authorName: me.username,
        authorAvatar,
        ipHash,
      },
      select: {
        id: true, status: true, createdAt: true,
        authorId: true, authorName: true, authorAvatar: true,
      },
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