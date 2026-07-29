'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { resolveAvatarUrl } from '@/lib/username'

interface AuthorInfo {
  userId: string | null
  authorName: string | null
  authorAvatar: string | null
  isLegacy: boolean   // userId === null = old anonymous comment
}

interface CommentRow {
  id: string
  content: string
  createdAt: string
  author: AuthorInfo | null
}

interface MeUser {
  id: string
  username: string | null
  email: string | null
  name: string | null
  bio: string | null
  avatarUrl: string | null
  onboarded: boolean
  isAdmin: boolean
}

interface CommentsProps {
  postSlug: string
}

const TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
}

export default function Comments({ postSlug }: CommentsProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [items, setItems] = useState<CommentRow[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Authoritative onboarded state — fetched from /api/users/me, NOT taken from
  // the session JWT. The session JWT can be stale across deploys (existing
  // users have tokens issued before we added the username field), and trusting
  // the JWT would mis-classify them as "not onboarded" while the DB says they
  // are. /api/users/me is the source of truth.
  const [me, setMe] = useState<MeUser | null>(null)
  const [meLoaded, setMeLoaded] = useState(false)

  const isLoggedIn = status === 'authenticated' && session?.user
  // isOnboarded comes from /api/users/me when available; falls back to
  // session.user.username so the UI updates instantly when the JWT eventually
  // gets refreshed.
  const isOnboarded = me?.onboarded ?? !!session?.user?.username
  const myUsername = me?.username ?? session?.user?.username ?? null
  const myAvatar = resolveAvatarUrl({ avatarUrl: me?.avatarUrl ?? null, email: me?.email ?? session?.user?.email ?? null })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/comments?postSlug=${encodeURIComponent(postSlug)}`)
      const json = await res.json()
      if (res.ok) setItems(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [postSlug])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  // Fetch authoritative user state from DB. Refreshes on login/logout so the
  // locked/review/comment-submit state matches the DB, not a stale JWT.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!isLoggedIn) {
      setMe(null)
      setMeLoaded(true)
      return
    }
    let cancelled = false
    fetch('/api/users/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        setMe(j?.user ?? null)
        setMeLoaded(true)
      })
      .catch(() => { if (!cancelled) setMeLoaded(true) })
    return () => { cancelled = true }
  }, [isLoggedIn, status])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (!isOnboarded) {
      router.push('/onboarding?callbackUrl=' + encodeURIComponent(window.location.pathname))
      return
    }

    const trimmed = content.trim()
    if (!trimmed) {
      setError('评论内容不能为空')
      return
    }
    if (trimmed.length > 2000) {
      setError('评论内容过长（上限 2000 字符）')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postSlug, content: trimmed }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setSuccess('已提交')
        setContent('')
        await load()
      } else {
        setError(json.error || '提交失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常')
    } finally {
      setSubmitting(false)
    }
  }

  const callbackUrl = typeof window !== 'undefined' ? window.location.pathname : '/'

  // While we're still loading me, render a neutral placeholder so the buttons
  // don't briefly mis-classify a logged-in user as anonymous.
  const showAuthedState = isLoggedIn && meLoaded

  return (
    <section className="blog-comments">
      <header className="blog-comments-header">
        <h2 className="blog-comments-title">评论</h2>
        <p className="blog-comments-notice">
          需要登录账号才能发表评论。
          {showAuthedState && isOnboarded && (
            <>当前以 <strong style={{ color: 'var(--gold-bright)' }}>@{myUsername}</strong> 身份发表评论。</>
          )}
        </p>
      </header>

      {!isLoggedIn ? (
        <div className="blog-comments-locked">
          <Button
            type="button"
            onClick={() =>
              router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
            }
          >
            登录后评论
          </Button>
        </div>
      ) : !meLoaded ? (
        // Still resolving /api/users/me — render a placeholder button so the
        // button isn't a flash of "先设置用户名" for users who ARE onboarded
        // (e.g., creator with a stale JWT).
        <div className="blog-comments-locked">
          <Button type="button" disabled>加载中…</Button>
        </div>
      ) : !isOnboarded ? (
        <div className="blog-comments-locked">
          <Button
            type="button"
            onClick={() =>
              router.push(`/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`)
            }
          >
            先设置用户名
          </Button>
        </div>
      ) : (
        <form className="blog-comments-form" onSubmit={submit}>
          <div className="blog-comments-form-meta" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              {myAvatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={myAvatar}
                  alt=""
                  style={{ width: 20, height: 20, borderRadius: '50%', verticalAlign: 'middle', marginRight: 6, objectFit: 'cover' }}
                />
              )}
              @{myUsername}
            </span>
          </div>
          <textarea
            className="blog-comments-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="说点什么…"
            rows={4}
            maxLength={2000}
            disabled={submitting}
          />
          <div className="blog-comments-form-meta">
            <span className="blog-comments-counter">{content.length} / 2000</span>
            <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
              {submitting ? '提交中…' : '提交评论'}
            </Button>
          </div>
          {error && <p className="blog-comments-error">{error}</p>}
          {success && <p className="blog-comments-success">{success}</p>}
        </form>
      )}

      <ul className="blog-comments-list">
        {loading ? (
          <li className="blog-comments-empty">加载中…</li>
        ) : items.length === 0 ? (
          <li className="blog-comments-empty">还没有评论，来抢沙发？</li>
        ) : (
          items.map((c) => <CommentItem key={c.id} c={c} />)
        )}
      </ul>
    </section>
  )
}

function CommentItem({ c }: { c: CommentRow }) {
  const a = c.author
  // Legacy anonymous: userId === null
  if (!a || !a.userId) {
    return (
      <li className="blog-comments-item">
        <div className="blog-comments-item-meta">
          <span className="blog-comments-anon">匿名访客</span>
          <time dateTime={c.createdAt}>
            {new Date(c.createdAt).toLocaleString('zh-CN', TIMESTAMP_OPTIONS)}
          </time>
        </div>
        <p className="blog-comments-item-content">{c.content}</p>
      </li>
    )
  }
  const avatar = a.authorAvatar ?? null
  return (
    <li className="blog-comments-item">
      <div className="blog-comments-item-meta">
        <span className="blog-comments-author">
          {avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="blog-comments-avatar" />
          )}
          <a href={`/u/${a.authorName ?? ''}`} className="blog-comments-username">
            @{a.authorName}
          </a>
          <span className="blog-comments-verified" title="已验证用户">✓</span>
        </span>
        <time dateTime={c.createdAt}>
          {new Date(c.createdAt).toLocaleString('zh-CN', TIMESTAMP_OPTIONS)}
        </time>
      </div>
      <p className="blog-comments-item-content">{c.content}</p>
    </li>
  )
}