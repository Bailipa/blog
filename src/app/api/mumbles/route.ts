import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const mumbles = await prisma.mumble.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json({ data: mumbles })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const mumble = await prisma.mumble.create({ data: { content: body.content } })
    return NextResponse.json({ data: mumble }, { status: 201 })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
