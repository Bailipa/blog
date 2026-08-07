// 面包多 (mbd.pub) 开放 API 封装。
// 文档: https://mbd.pub/open_doc/
// 认证: Header `x-token: 开发者key`（创建于 mbd.pub/o/config/developer）
const MBD_API = process.env.MBD_API_BASE || 'https://x.mbd.pub/api'

export interface MbdOrderDetail {
  code: number
  result?: {
    amount: number
    state: number // 1 已支付, 0 未支付
    channel?: string
    timestamp?: number
    buyer?: number
    product?: number
    product_url_key?: string
    out_order_id?: string | null
  }
  error_info?: string
}

export interface MbdCallbackPayload {
  order_id: string
  out_order_id?: string | null
  product_name?: string
  product_url_key?: string
  amount?: number
  state?: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.MBD_DEV_KEY
  if (!key) {
    throw new Error('MBD_DEV_KEY 未配置')
  }
  const res = await fetch(`${MBD_API}${path}`, {
    ...init,
    headers: {
      'x-token': key,
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    throw new Error(`面包多 API ${path} 返回 ${res.status}`)
  }
  return res.json() as Promise<T>
}

/**
 * 查询订单。order_id 与 out_order_id 二选一。
 * https://x.mbd.pub/api/order-detail
 */
export function getOrderDetail(opts: {
  order_id?: string
  out_order_id?: string
}): Promise<MbdOrderDetail> {
  const qs = new URLSearchParams()
  if (opts.order_id) qs.set('order_id', opts.order_id)
  if (opts.out_order_id) qs.set('out_order_id', opts.out_order_id)
  return request<MbdOrderDetail>(`/order-detail?${qs.toString()}`)
}

/** 查询所有订单（用于对账/兜底）。https://x.mbd.pub/api/order-list */
export async function getOrderList(opts: { page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams()
  if (opts.page) qs.set('page', String(opts.page))
  if (opts.limit) qs.set('limit', String(opts.limit))
  return request<{ code: number; result?: { orders?: unknown[] }; error_info?: string }>(
    `/order-list?${qs.toString()}`,
  )
}

/** 查询作品列表。https://x.mbd.pub/api/product-list */
export async function getProductList(opts: { page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams()
  if (opts.page) qs.set('page', String(opts.page))
  if (opts.limit) qs.set('limit', String(opts.limit))
  return request<{ code: number; result?: { products?: unknown[] }; error_info?: string }>(
    `/product-list?${qs.toString()}`,
  )
}

/**
 * 构造面包多购买链接（带独立订单号）。
 * out_order_id 用于回调时关联到「哪个本站用户购买了哪篇文章」。
 */
export function buildMbdPurchaseUrl(
  productUrl: string,
  outOrderId: string,
): string {
  const sep = productUrl.includes('?') ? '&' : '?'
  return `${productUrl}${sep}out_order_id=${encodeURIComponent(outOrderId)}`
}

export const MBD_DEV_KEY_SET = () => !!process.env.MBD_DEV_KEY
