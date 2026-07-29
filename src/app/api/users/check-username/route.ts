// Username availability check for the /onboarding form. Debounced from the
// client; returns whether the slug is free and, if not, a couple of
// alternative suggestions.

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateUsername } from '@/lib/username'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

function randomDigits(n: number) {
  let out = ''
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10)
  return out
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('u')
    const validation = validateUsername(raw)
    if (!validation.ok) {
      return NextResponse.json(
        { available: false, reason: validation.reason, suggestions: [] },
        { status: 200 },
      )
    }
    const username = validation.normalized

    const session = await auth()
    const meId = session?.user?.id ?? null

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true, deletedAt: true },
    })

    // Available if: doesn't exist, OR it's the current user's own username,
    // OR the existing record is soft-deleted (someone can claim a freed slug).
    const available =
      !existing || existing.id === meId || existing.deletedAt !== null

    if (available) {
      return NextResponse.json({ available: true, suggestions: [] }, { status: 200 })
    }

    // Suggest a few alternatives
    const suggestions: string[] = []
    for (let i = 0; suggestions.length < 3 && i < 8; i++) {
      const candidate = `${username}-${randomDigits(username.length > 14 ? 2 : 3)}`
      if (candidate.length > 20) continue
      const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })
      if (!taken) suggestions.push(candidate)
    }

    return NextResponse.json(
      { available: false, reason: 'username 已被占用', suggestions },
      { status: 200 },
    )
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}