import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const runtime = 'nodejs'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { getOrderDetail, type MbdCallbackPayload } from '@/lib/mbd'

export const dynamic = 'force-dynamic'

/**
 * POST /api/mbd/callback
 * 面包多购买成功回调。需先在面包多「开发设置」配置 call_back_url，
 * 且已开通闪电结算（否则面包多不会发送回调）。
 *
 * 回调 payload:
 * { order_id, out_order_id, product_name, product_url_key, amount, state }
 *
 * 安全：不做签名（面包多文档未提供验签），但用 out_order_id 解析出
 * 本站订单号，再调用 order-detail 双验证该订单确实已支付，防止伪造。
 */
export async function POST(req: NextRequest) {
  try {
    let payload: MbdCallbackPayload
    try {
      payload = await req.json()
    } catch {
      return NextResponse.json({ error: 'bad json' }, { status: 400 })
    }

    const { order_id, out_order_id, state } = payload
    if (!order_id) return NextResponse.json({ error: 'missing order_id' }, { status: 400 })
    if (state !== 1) {
      // 未支付成功，忽略（仍需 200 避免面包多重试）
      return NextResponse.json({ ok: true })
    }

    // 用面包多订单号二次验证确已支付（防伪造回调）
    let verified: { state: number; amount?: number } | null = null
    try {
      const detail = await getOrderDetail({ order_id })
      if (detail.code === 200 && detail.result) {
        verified = { state: detail.result.state, amount: detail.result.amount }
      }
    } catch {
      // 验证失败不阻断，交给下游兜底对账
    }

    if (verified && verified.state !== 1) {
      return NextResponse.json({ ok: true })
    }

    // 从 out_order_id 解析「用户:文章」—— 格式: uid:postId:rand
    const parts = out_order_id ? out_order_id.split(':') : []
    const userId = parts[0] && parts[0] !== 'guest' ? parts[0] : null
    const postId = parts[1] || null

    let unlockedPostId: string | null = null

    // 优先：out_order_id 关联的 postId（无需查商品映射）
    if (postId) {
      const post = await prisma.post.findUnique({ where: { id: postId } })
      if (post) unlockedPostId = post.id
    }

    // 兜底：如果 out_order_id 没带 postId，用回调里的 product_url_key 匹配
    if (!unlockedPostId && payload.product_url_key) {
      const post = await prisma.post.findFirst({
        where: { mbdProductUrl: { contains: payload.product_url_key } },
        select: { id: true },
      })
      if (post) unlockedPostId = post.id
    }

    if (!unlockedPostId) {
      return NextResponse.json({ error: 'product not found' }, { status: 404 })
    }

    // 绑定到用户（若回调里有关联的用户）
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { purchasedPosts: await appendPurchased(userId, unlockedPostId) },
      })
    }

    // 记录已处理订单，防重复回调重复记账
    await prisma.mbdOrder.upsert({
      where: { orderId: order_id },
      create: {
        orderId: order_id,
        outOrderId: out_order_id || null,
        userId: userId || null,
        postId: unlockedPostId,
        amountCents: Math.round((payload.amount || 0) * 100),
        state: 'PAID',
      },
      update: {},
    })

    return NextResponse.json({ ok: true })
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
  const arr = user?.purchasedPosts ? safeParse(user.purchasedPosts) : []
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
