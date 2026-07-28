import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAdmin'
import { apiErrorHandler } from '@/lib/apiErrorHandler'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const status = body.status
    if (status !== 'VISIBLE' && status !== 'HIDDEN') {
      return NextResponse.json({ error: 'status 必须是 VISIBLE 或 HIDDEN' }, { status: 400 })
    }
    const comment = await prisma.comment.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    })
    return NextResponse.json({ data: comment })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}