import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/paywall'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const session = await auth()
  if (!session?.user?.isAdmin) redirect('/admin/login')

  const orders = await prisma.mbdOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { username: true } } },
  })

  const totalPaid = orders.reduce((sum, o) => sum + o.amountCents, 0)

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">付费订单</h1>

      <div className="admin-form-card">
        <div className="admin-form-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
          <div>
            <strong>面包多回调配置：</strong>
            在 <code>mbd.pub/o/config/developer</code> 设置 call_back_url 为
            <code> https://blog.dogeggcode.cyou/api/mbd/callback</code>，
            并开通闪电结算（5.7% 费率）后，买家付款将自动解锁对应文章。
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            共 {orders.length} 条订单 · 累计 ¥{(totalPaid / 100).toFixed(2)}（仅供参考，以面包多结算为准）
          </div>
        </div>
      </div>

      <div className="admin-card">
        {orders.length === 0 ? (
          <p className="admin-empty">暂无订单记录</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>面包多订单号</th>
                <th>独立订单号</th>
                <th>用户</th>
                <th>金额</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{new Date(o.createdAt).toLocaleString('zh-CN')}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{o.orderId}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {o.outOrderId || '-'}
                  </td>
                  <td>{o.user?.username || '-'}</td>
                  <td>{formatPrice(o.amountCents)}</td>
                  <td>
                    <span className={`admin-status admin-status-published`}>{o.state}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
