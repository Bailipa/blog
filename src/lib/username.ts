// Username validation + Gravatar helpers shared by /login, /onboarding,
// /u/[username], and the profile-edit page.

import { createHash } from 'crypto'

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,18}[a-z0-9])$/

// Reserved usernames: cannot be used as profile slugs because they collide
// with route prefixes, system paths, or are commonly targeted for squatting.
export const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'login', 'logout', 'register', 'signup', 'signin', 'signout',
  'u', 'user', 'users', 'me', 'about', 'blog', 'settings', 'edit', 'profile',
  'posts', 'mumbles', 'friend-links', 'projects', 'comments',
  'new', 'search', 'tag', 'tags', 'category', 'categories',
  'the-system', 'system', 'root', 'static', 'public', 'assets',
  'index', 'home', 'help', 'support', 'docs', 'doc',
  'onboarding', 'post-verify', 'admin-login',
  'rss', 'feed', 'sitemap', 'robots',
])

export type UsernameValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; reason: string }

export function validateUsername(raw: unknown): UsernameValidationResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'username 必须是字符串' }
  const normalized = raw.trim().toLowerCase()
  if (normalized.length < 3) return { ok: false, reason: 'username 至少 3 个字符' }
  if (normalized.length > 20) return { ok: false, reason: 'username 不能超过 20 个字符' }
  if (!USERNAME_RE.test(normalized)) {
    return {
      ok: false,
      reason: 'username 只能包含小写字母、数字、连字符；不能以连字符开头或结尾',
    }
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, reason: `username "${normalized}" 是保留字，不可使用` }
  }
  return { ok: true, normalized }
}

export function validateName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().slice(0, 30)
  return trimmed || null
}

export function validateBio(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().slice(0, 200)
  return trimmed || null
}

// Gravatar: avatar URL keyed off md5(lowercased email). Used as the default
// when a User has no uploaded avatar. The 'identicon' fallback gives a
// deterministic colored geometry when no Gravatar is registered.
export function gravatarUrlFor(email: string | null | undefined, size = 80): string | null {
  if (!email) return null
  const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex')
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`
}

// Render-time helper: given a User's avatarUrl field, return the URL to show.
// - null  → fall back to Gravatar by email
// - '/uploads/...' → uploaded avatar (override)
// - 'http...' → explicit URL (rare)
export function resolveAvatarUrl(user: { avatarUrl: string | null; email: string | null } | null | undefined): string | null {
  if (!user) return null
  if (user.avatarUrl && user.avatarUrl.startsWith('/')) return user.avatarUrl
  if (user.avatarUrl && /^https?:\/\//.test(user.avatarUrl)) return user.avatarUrl
  return gravatarUrlFor(user.email, 80)
}

export const AVATAR_MAX_BYTES = 1 * 1024 * 1024  // 1MB per R3
export const AVATAR_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])