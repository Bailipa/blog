import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const runtime = 'nodejs'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { isValidRedeemCode } from '@/lib/redeemCode'

// POST /api/purchase/redeem  { code, postSlug }
// 校验面包多发放的兑换码，绑定到当前登录用户（或 IP 会话），并返回是否解锁。
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    const body = await req.json().catch(() => null)
    const code = (body?.code ?? '').trim().toUpperCase()
    const postSlug = body?.postSlug as string | undefined

    if (!isValidRedeemCode(code)) {
      return NextResponse.json({ error: '兑换码格式不正确' }, { status: 400 })
    }
    if (!postSlug) {
      return NextResponse.json({ error: '缺少文章参数' }, { status: 400 })
    }

    const post = await prisma.post.findUnique({ where: { slug: postSlug } })
    if (!post || post.status !== 'PUBLISHED') {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }
    if (post.accessTier !== 'paid') {
      return NextResponse.json({ error: '该文章无需兑换' }, { status: 400 })
    }

    const record = await prisma.redeemCode.findUnique({ where: { code } })
    if (!record || record.postId !== post.id) {
      return NextResponse.json({ error: '兑换码无效或不属于该文章' }, { status: 400 })
    }
    if (record.status === 'USED') {
      return NextResponse.json({ error: '该兑换码已被使用' }, { status: 400 })
    }

    // 未登录也允许兑换：绑定到 IP 指纹，用户登录后可解锁（guest 解锁暂记录在码上，
    // 登录用户则写入 purchasedPosts 以便跨会话持久）。
    if (!userId) {
      return NextResponse.json({ error: '请先登录后再兑换' }, { status: 401 })
    }

    await prisma.$transaction([
      prisma.redeemCode.update({
        where: { id: record.id },
        data: { status: 'USED', redeemedById: userId, redeemedAt: new Date() },
      }),
      // 追加 postId 到用户 purchasedPosts
      prisma.user.update({
        where: { id: userId },
        data: { purchasedPosts: await appendPurchased(userId, post.id) },
      }),
    ])

    return NextResponse.json({ data: { unlocked: true, slug: post.slug } })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

async function appendPurchased(userId: string, postId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { purchasedPosts: true },
  })
  const arr: string[] = user?.purchasedPosts ? safeParse(user.purchasedPosts) : []
  if (!arr.includes(postId)) arr.push(postId)
  return JSON.stringify(arr)
}

function safeParse(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
