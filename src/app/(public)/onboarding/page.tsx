'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

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

export default function OnboardingPage() {
  const router = useRouter()
  const search = useSearchParams()
  const { status: sessionStatus, update: updateSession } = useSession()
  const [me, setMe] = useState<MeUser | null>(null)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'checking' }
    | { kind: 'ok' }
    | { kind: 'bad'; reason: string }
  >({ kind: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const callbackUrl = search.get('callbackUrl') || '/'

  // Gate: must be logged in
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (sessionStatus === 'unauthenticated') {
      router.replace(`/login?callbackUrl=${encodeURIComponent('/onboarding')}`)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sessionStatus, router])

  // Load my profile
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (sessionStatus !== 'authenticated') return
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((j) => {
        const u: MeUser | null = j?.user ?? null
        setMe(u)
        if (u) {
          setUsername(u.username ?? '')
          setName(u.name ?? '')
          setBio(u.bio ?? '')
          setAvatarUrl(u.avatarUrl ?? null)
          if (u.onboarded) {
            router.replace(callbackUrl)
          }
        }
      })
      .catch(() => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sessionStatus, callbackUrl, router])

  // Username availability check (debounced)
  const checkUsername = useCallback(async (raw: string) => {
    if (!raw) {
      setUsernameStatus({ kind: 'idle' })
      return
    }
    setUsernameStatus({ kind: 'checking' })
    try {
      const r = await fetch(`/api/users/check-username?u=${encodeURIComponent(raw)}`)
      const j = await r.json()
      if (j.available) {
        setUsernameStatus({ kind: 'ok' })
      } else {
        setUsernameStatus({ kind: 'bad', reason: j.reason ?? '不可用' })
      }
    } catch {
      setUsernameStatus({ kind: 'bad', reason: '检查失败' })
    }
  }, [])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!username) return
    const id = setTimeout(() => checkUsername(username), 350)
    return () => clearTimeout(id)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [username, checkUsername])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (usernameStatus.kind === 'bad') {
      setError(usernameStatus.reason)
      return
    }
    if (usernameStatus.kind === 'checking') {
      setError('正在检查 username 可用性…')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/users/me/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, bio, avatarUrl }),
      })
      const j = await r.json()
      if (!r.ok) {
        setError(j.error ?? '保存失败')
        return
      }
      // Refresh the JWT so the Header dropdown (and any other useSession()
      // consumer) sees the new username / name / avatar immediately,
      // without waiting for the cookie to expire.
      await updateSession({})
      router.replace(callbackUrl)
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

  // Gravatar URL — uses a tiny hash for preview only; the server-side
  // helper computes the real md5 for actual Gravatar fetches.
  const displayAvatar =
    avatarUrl ??
    (me.email
      ? `https://www.gravatar.com/avatar/${previewHash(me.email)}?d=identicon&s=120`
      : null)

  return (
    <div className="onboarding-page">
      <div className="onboarding-box">
        <h1 className="onboarding-heading">完善你的资料</h1>
        <p className="onboarding-sub">
          设置用户名后即可发表评论。用户名将出现在公开个人主页的 URL 中。
        </p>

        <form onSubmit={submit} className="onboarding-form">
          <div className="onboarding-avatar-row">
            <div className="onboarding-avatar">
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayAvatar} alt="avatar" />
              ) : (
                <div className="onboarding-avatar-placeholder">
                  {me.email?.[0]?.toUpperCase() ?? '?'}
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
            <label htmlFor="username">
              用户名 <span className="onboarding-required">*</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="3-20 字符，小写字母/数字/连字符"
              required
              autoFocus
              minLength={3}
              maxLength={20}
            />
            <UsernameStatus status={usernameStatus} />
            <p className="onboarding-hint">
              个人主页将位于 <code>/u/{username || 'username'}</code>
            </p>
          </div>

          <div className="onboarding-field">
            <label htmlFor="name">显示名</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="留空则使用用户名"
              maxLength={30}
            />
          </div>

          <div className="onboarding-field">
            <label htmlFor="bio">个性签名</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="一句话介绍一下自己（最多 200 字符）"
              rows={3}
              maxLength={200}
            />
          </div>

          {error && <p className="onboarding-error">{error}</p>}

          <button
            type="submit"
            disabled={
              submitting ||
              !username ||
              usernameStatus.kind === 'checking' ||
              usernameStatus.kind === 'bad'
            }
            className="onboarding-btn"
          >
            {submitting ? '保存中…' : '完成'}
          </button>
        </form>
      </div>
    </div>
  )
}

function UsernameStatus({
  status,
}: {
  status: { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok' } | { kind: 'bad'; reason: string }
}) {
  if (status.kind === 'idle') return null
  if (status.kind === 'checking') {
    return <p className="onboarding-hint">检查中…</p>
  }
  if (status.kind === 'ok') {
    return <p className="onboarding-success">✓ username 可用</p>
  }
  return <p className="onboarding-error">{status.reason}</p>
}

// Preview-only hash: the server-side `gravatarUrlFor` computes the real
// md5; this is just for the immediate render of the placeholder image
// during onboarding. Email is unique per user so collisions are harmless.
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