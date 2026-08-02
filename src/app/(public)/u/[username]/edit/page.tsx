'use client'

import { use, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface MeUser {
  id: string
  username: string
  email: string | null
  name: string | null
  bio: string | null
  avatarUrl: string | null
  onboarded: boolean
  isAdmin: boolean
}

// Next.js 15+ passes params as a Promise. Use `use()` to unwrap it in a
// client component (it's a stable API, equivalent to await in async server
// components). The page used to take `{ username }` directly which silently
// gave it `undefined` — clicking 编辑资料 in the dropdown then redirected
// to /u/undefined because the page's useEffect ran with username===undefined.
export default function ProfileEditPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = use(params)
  const router = useRouter()
  const { data: session, status: sessionStatus, update: updateSession } = useSession()
  const [me, setMe] = useState<MeUser | null>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [newUsername, setNewUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<
    { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'bad'; reason: string }
  >({ kind: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (sessionStatus === 'unauthenticated') {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/u/${username}/edit`)}`)
    } else if (sessionStatus === 'authenticated' && !session?.user?.username) {
      // Stale JWT: session.user.username is null but the layout just
      // confirmed via DB that we are the legitimate owner of this
      // profile. Resync so the Header dropdown (and the in-page
      // username input prefill) reflect reality. Without this, the
      // menu still shows "完善资料" until the user actually saves.
      updateSession({})
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sessionStatus, session, router, username, updateSession])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (sessionStatus !== 'authenticated') return
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((j) => {
        const u: MeUser | null = j?.user ?? null
        if (!u || u.username !== username) {
          // Not your profile; bounce to the public page
          router.replace(`/u/${username}`)
          return
        }
        setMe(u)
        setName(u.name ?? '')
        setBio(u.bio ?? '')
        setAvatarUrl(u.avatarUrl ?? null)
        setNewUsername(u.username)
      })
      .catch(() => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sessionStatus, username, router])

  const checkUsername = useCallback(async (raw: string) => {
    if (!raw) {
      setUsernameStatus({ kind: 'idle' })
      return
    }
    setUsernameStatus({ kind: 'checking' })
    try {
      const r = await fetch(`/api/users/check-username?u=${encodeURIComponent(raw)}`)
      const j = await r.json()
      if (j.available) setUsernameStatus({ kind: 'ok' })
      else setUsernameStatus({ kind: 'bad', reason: j.reason ?? '不可用' })
    } catch {
      setUsernameStatus({ kind: 'bad', reason: '检查失败' })
    }
  }, [])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!newUsername || newUsername === me?.username) {
      setUsernameStatus({ kind: 'idle' })
      return
    }
    const id = setTimeout(() => checkUsername(newUsername), 350)
    return () => clearTimeout(id)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [newUsername, me?.username, checkUsername])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (usernameStatus.kind === 'bad') {
      setError(usernameStatus.reason)
      return
    }
    if (usernameStatus.kind === 'checking') {
      setError('username 检查中…')
      return
    }
    if (!me) return
    setSubmitting(true)
    try {
      const r = await fetch(`/api/users/${encodeURIComponent(me.username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          name,
          bio,
          avatarUrl,
          notifyOnReply: undefined, // unchanged
          notifyOnNewPost: undefined,
        }),
      })
      const j = await r.json()
      if (!r.ok) {
        setError(j.error ?? '保存失败')
        return
      }
      // Username might have changed; if so, navigate to the new URL.
      const newUsernameFinal = j.user?.username as string
      if (newUsernameFinal && newUsernameFinal !== username) {
        // Refresh JWT so Header dropdown / 我的主页 link uses the new
        // username. update() re-runs the jwt callback with trigger='update'.
        await updateSession({})
        router.replace(`/u/${newUsernameFinal}/edit?renamed=1`)
      } else {
        // Even when username didn't change, name / bio / avatar might have.
        // Refresh JWT so the next render reflects them.
        await updateSession({})
        setSavedAt(new Date().toLocaleTimeString('zh-CN'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络异常')
    } finally {
      setSubmitting(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch('/api/users/avatar', { method: 'POST', body: form })
      const j = await r.json()
      if (!r.ok) {
        setError(j.error ?? '上传失败')
        return
      }
      setAvatarUrl(j.avatarUrl)
      // Refresh JWT so Header avatar reflects the new upload without
      // waiting for cookie expiry.
      await updateSession({})
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    setUploading(true)
    try {
      await fetch('/api/users/avatar', { method: 'DELETE' })
      setAvatarUrl(null)
      await updateSession({})
    } finally {
      setUploading(false)
    }
  }

  if (sessionStatus === 'loading' || !me) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-box">
          <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>加载中…</p>
        </div>
      </div>
    )
  }

  const displayAvatar =
    avatarUrl ??
    (me.email
      ? `https://www.gravatar.com/avatar/${previewHash(me.email)}?d=identicon&s=120`
      : null)

  const usernameChanged = newUsername !== me.username

  return (
    <div className="onboarding-page">
      <div className="onboarding-box">
        <h1 className="onboarding-heading">编辑资料</h1>
        <p className="onboarding-sub">
          修改后将立即生效。修改 username 会同步更新你过往评论中显示的名字。
        </p>

        <form onSubmit={save} className="onboarding-form">
          <div className="onboarding-avatar-row">
            <div className="onboarding-avatar">
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayAvatar} alt="avatar" />
              ) : (
                <div className="onboarding-avatar-placeholder">
                  {(me.name ?? me.username)[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="onboarding-avatar-actions">
              <button
                type="button"
                className="onboarding-btn-secondary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? '上传中…' : '上传头像'}
              </button>
              {avatarUrl && avatarUrl.startsWith('/uploads/avatars/') && (
                <button
                  type="button"
                  className="onboarding-btn-link"
                  onClick={removeAvatar}
                  disabled={uploading}
                >
                  使用 Gravatar
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadAvatar(f)
                  e.target.value = ''
                }}
              />
              <p className="onboarding-hint">最大 1MB，JPEG / PNG / WebP</p>
            </div>
          </div>

          <div className="onboarding-field">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
              minLength={3}
              maxLength={20}
            />
            {usernameChanged && (
              <UsernameStatusInline status={usernameStatus} />
            )}
            <p className="onboarding-hint">
              个人主页将位于 <code>/u/{newUsername || 'username'}</code>
              {usernameChanged && <strong style={{ color: 'var(--gold-bright)' }}>（已修改）</strong>}
            </p>
          </div>

          <div className="onboarding-field">
            <label htmlFor="name">显示名</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="onboarding-field">
            <label htmlFor="bio">个性签名</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>

          {error && <p className="onboarding-error">{error}</p>}
          {savedAt && !error && <p className="onboarding-success">已保存 {savedAt}</p>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={submitting || (usernameChanged && usernameStatus.kind !== 'ok')}
              className="onboarding-btn"
            >
              {submitting ? '保存中…' : '保存'}
            </button>
            <button
              type="button"
              className="onboarding-btn-link"
              onClick={() => router.push(`/u/${me.username}`)}
            >
              查看个人主页
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UsernameStatusInline({
  status,
}: {
  status: { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'bad'; reason: string }
}) {
  if (status.kind === 'checking') return <p className="onboarding-hint">检查中…</p>
  if (status.kind === 'ok') return <p className="onboarding-success">✓ username 可用</p>
  if (status.kind === 'bad') return <p className="onboarding-error">{status.reason}</p>
  return null
}

function previewHash(input: string): string {
  let h1 = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i)
    h1 = Math.imul(h1, 0x01000193) >>> 0
  }
  let h2 = 0xdeadbeef
  for (let i = input.length - 1; i >= 0; i--) {
    h2 ^= input.charCodeAt(i)
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0
  }
  const a = h1.toString(16).padStart(8, '0')
  const b = h2.toString(16).padStart(8, '0')
  return (a + b).repeat(2).slice(0, 32)
}