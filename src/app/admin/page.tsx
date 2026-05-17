import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user?.isAdmin) redirect('/admin/login')

  const [postCount, categoryCount, tagCount, projectCount, recentPosts] =
    await Promise.all([
      prisma.post.count(),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.project.count(),
      prisma.post.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, updatedAt: true },
      }),
    ])

  return (
    <div className="admin-dashboard">
      <h1 className="admin-page-title">管理概览</h1>
      <div className="admin-stats-grid">
        <Card><CardHeader><CardTitle>文章</CardTitle></CardHeader><CardContent className="admin-stat-value">{postCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>分类</CardTitle></CardHeader><CardContent className="admin-stat-value">{categoryCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>标签</CardTitle></CardHeader><CardContent className="admin-stat-value">{tagCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>作品</CardTitle></CardHeader><CardContent className="admin-stat-value">{projectCount}</CardContent></Card>
      </div>

      <Card className="admin-recent-card">
        <CardHeader><CardTitle>最近更新</CardTitle></CardHeader>
        <CardContent>
          <table className="admin-table">
            <thead>
              <tr><th>标题</th><th>状态</th><th>更新时间</th></tr>
            </thead>
            <tbody>
              {recentPosts.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td><span className={`admin-status admin-status-${p.status.toLowerCase()}`}>{p.status}</span></td>
                  <td>{p.updatedAt.toLocaleDateString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
