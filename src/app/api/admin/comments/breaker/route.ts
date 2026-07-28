import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAdmin'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { getBreaker, setBreaker } from '@/lib/comments'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await requireAdmin()
    const breaker = await getBreaker(prisma)
    return NextResponse.json({ data: breaker })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json().catch(() => ({}))
    const open = !!body.open
    const current = await getBreaker(prisma)
    await setBreaker(prisma, {
      open,
      reason: open ? 'manual' : null,
      trippedAt: open ? (current.trippedAt ?? new Date().toISOString()) : null,
    })
    const next = await getBreaker(prisma)
    return NextResponse.json({ data: next })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}