// PATCH /api/users/[username]
//
// Update a User's profile. Caller must be authenticated as the same user
// being updated (i.e. you can only edit your own profile via this route).
//
// Username-change cascade (R1): when username changes, all of this user's
// Comment rows have their snapshot `authorName` updated to the new username.
// The `authorId` link stays the same — only the display snapshot changes.
//
// Body:
//   { username?, name?, bio?, avatarUrl?, notifyOnReply?, notifyOnNewPost? }

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { validateUsername, validateName, validateBio } from '@/lib/username'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    const { username: routeUsername } = await params

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, onboarded: true },
    })
    if (!me) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    // Authorization: route username must match the caller's own username.
    // We don't allow editing another user's profile via this endpoint.
    if (me.username !== routeUsername) {
      return NextResponse.json({ error: '只能编辑自己的资料' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}
    let usernameChanged = false
    let oldUsername: string | null = null

    // username (with R1 cascade)
    if (typeof body.username === 'string' && body.username !== me.username) {
      const validation = validateUsername(body.username)
      if (!validation.ok) {
        return NextResponse.json({ error: validation.reason }, { status: 400 })
      }
      const candidate = validation.normalized
      const conflict = await prisma.user.findFirst({
        where: { username: candidate, NOT: { id: me.id } },
        select: { id: true },
      })
      if (conflict) {
        return NextResponse.json({ error: '该 username 已被占用' }, { status: 409 })
      }
      oldUsername = me.username
      updates.username = candidate
      usernameChanged = true
    }

    // name (display name)
    if ('name' in body) {
      updates.name = validateName(body.name)
    }

    // bio
    if ('bio' in body) {
      updates.bio = validateBio(body.bio)
    }

    // avatarUrl: explicit null clears (falls back to Gravatar); string sets
    if ('avatarUrl' in body) {
      if (body.avatarUrl === null || body.avatarUrl === '') {
        updates.avatarUrl = null
      } else if (typeof body.avatarUrl === 'string') {
        if (!body.avatarUrl.startsWith('/uploads/avatars/')) {
          return NextResponse.json(
            { error: 'avatarUrl 必须为 /uploads/avatars/ 下的相对路径' },
            { status: 400 },
          )
        }
        updates.avatarUrl = body.avatarUrl
      }
    }

    // notification prefs
    if (typeof body.notifyOnReply === 'boolean') updates.notifyOnReply = body.notifyOnReply
    if (typeof body.notifyOnNewPost === 'boolean') updates.notifyOnNewPost = body.notifyOnNewPost

    // Mark onboarded the first time a username is set (also true on
    // subsequent edits, idempotent — flag is just "has set username once").
    if (usernameChanged) {
      updates.onboarded = true
      // First-ever username set also flips `emailVerified` to now (we already
      // verified via magic-link; this is just a record-keeping marker).
      // We only set this if not already set to avoid bumping it on edits.
      const fresh = await prisma.user.findUnique({
        where: { id: me.id },
        select: { emailVerified: true },
      })
      if (!fresh?.emailVerified) updates.emailVerified = new Date()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, user: me })
    }

    // Apply the user update, and on username change also cascade to
    // Comment.authorName in a single transaction.
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: me.id },
        data: updates,
        select: {
          id: true, username: true, email: true, name: true, bio: true,
          avatarUrl: true, onboarded: true, isAdmin: true,
        },
      })
      if (usernameChanged && oldUsername && updates.username) {
        await tx.comment.updateMany({
          where: { authorId: me.id, authorName: oldUsername },
          data: { authorName: updates.username as string },
        })
      }
      return u
    })

    return NextResponse.json({ ok: true, user: updated })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}