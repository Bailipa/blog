import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const runtime = 'nodejs'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { generateRedeemCode } from '@/lib/redeemCode'

// Admin-only: manage redeem code stock for a post.
// GET  /api/purchase/codes?postId=xxx  → list codes
// POST /api/purchase/codes { postId, count } → generate N codes
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get('postId')
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

    const codes = await prisma.redeemCode.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      include: { redeemedBy: { select: { username: true } } },
    })
    return NextResponse.json({ data: codes })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const postId = body?.postId as string | undefined
    const count = Math.min(500, Math.max(1, Number(body?.count) || 10))

    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const records: { code: string; postId: string }[] = []
    while (records.length < count) {
      const code = generateRedeemCode()
      const exists = await prisma.redeemCode.findUnique({ where: { code } })
      if (!exists) records.push({ code, postId })
    }

    await prisma.redeemCode.createMany({ data: records })
    return NextResponse.json({ data: { count: records.length, codes: records.map((r) => r.code) } }, { status: 201 })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await prisma.redeemCode.delete({ where: { id } })
    return NextResponse.json({ data: { id } })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
