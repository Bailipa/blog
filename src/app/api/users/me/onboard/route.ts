// POST /api/users/me/onboard
//
// First-time profile setup for users who just registered and have no
// username yet. Distinct from /api/users/[username] PATCH which requires
// the user to already have a username (route param match).
//
// Body: { username, name?, bio?, avatarUrl? }
//
// Marks onboarded=true and sets emailVerified=now on success.

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { validateUsername, validateName, validateBio } from '@/lib/username'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, onboarded: true, emailVerified: true },
    })
    if (!me) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const validation = validateUsername(body.username)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason }, { status: 400 })
    }
    const candidate = validation.normalized

    // Reject if username is already taken by someone else (or this user
    // is reusing their own — that's allowed, idempotent).
    const conflict = await prisma.user.findFirst({
      where: { username: candidate, NOT: { id: me.id } },
      select: { id: true, deletedAt: true },
    })
    if (conflict && !conflict.deletedAt) {
      return NextResponse.json({ error: '该 username 已被占用' }, { status: 409 })
    }

    const updates: Record<string, unknown> = {
      username: candidate,
      onboarded: true,
    }
    if ('name' in body) updates.name = validateName(body.name)
    if ('bio' in body) updates.bio = validateBio(body.bio)
    if ('avatarUrl' in body) {
      if (body.avatarUrl === null || body.avatarUrl === '') {
        updates.avatarUrl = null
      } else if (typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith('/uploads/avatars/')) {
        updates.avatarUrl = body.avatarUrl
      }
    }
    if (!me.emailVerified) updates.emailVerified = new Date()

    const updated = await prisma.user.update({
      where: { id: me.id },
      data: updates,
      select: {
        id: true, username: true, email: true, name: true, bio: true,
        avatarUrl: true, onboarded: true, isAdmin: true,
      },
    })
    return NextResponse.json({ ok: true, user: updated })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}