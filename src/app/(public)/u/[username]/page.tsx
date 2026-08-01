// Public profile page. Visible to anonymous visitors. Shows display name,
// bio, joined date, and recent comments authored by this user.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { resolveAvatarUrl } from '@/lib/username'
import { auth } from '@/lib/auth'
import ProfileEditButton from './ProfileEditButton'

interface PageProps {
  params: Promise<{ username: string }>
}

export const dynamic = 'force-dynamic'

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params
  const user = await prisma.user.findFirst({
    where: { username, deletedAt: null },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      email: true,
      createdAt: true,
      isAdmin: true,
    },
  })
  if (!user) notFound()

  const comments = await prisma.comment.findMany({
    where: { authorId: user.id, status: 'VISIBLE' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      content: true,
      createdAt: true,
      post: { select: { slug: true, title: true } },
    },
  })

  const session = await auth()
  const isMe = session?.user?.id === user.id
  const avatar = resolveAvatarUrl(user)

  return (
    <article className="profile-page">
      <header className="profile-header">
        <div className="profile-avatar">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={user.username ?? ''} />
          ) : (
            <div className="profile-avatar-placeholder">
              {(user.name ?? user.username ?? '?')[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="profile-meta">
          <h1 className="profile-name">{user.name || user.username}</h1>
          <p className="profile-username">@{user.username}</p>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          <p className="profile-joined">
            加入于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
            {user.isAdmin && <span className="profile-admin-badge">管理员</span>}
          </p>
          {isMe && <ProfileEditButton username={user.username!} />}
        </div>
      </header>

      <section className="profile-comments">
        <h2 className="profile-section-title">最近评论</h2>
        {comments.length === 0 ? (
          <p className="profile-empty">还没有评论。</p>
        ) : (
          <ul className="profile-comment-list">
            {comments.map((c) => (
              <li key={c.id} className="profile-comment-item">
                <Link href={`/blog/${c.post.slug}`} className="profile-comment-post">
                  {c.post.title}
                </Link>
                <p className="profile-comment-content">{c.content}</p>
                <time className="profile-comment-time">
                  {new Date(c.createdAt).toLocaleString('zh-CN')}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  )
}