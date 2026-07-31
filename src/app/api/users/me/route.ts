// Returns the current session's user. Used by /onboarding and various
// client components (Header avatar dropdown, Comments editor) to read
// fresh DB state instead of trusting the JWT (which can lag after a
// profile edit).

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { apiErrorHandler } from '@/lib/apiErrorHandler'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        bio: true,
        avatarUrl: true,
        onboarded: true,
        isAdmin: true,
        deletedAt: true,
      },
    })
    if (!user || user.deletedAt) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    return NextResponse.json({ user })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}