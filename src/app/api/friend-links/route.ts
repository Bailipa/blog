import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
export const runtime = 'nodejs'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const links = await prisma.friendLink.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json({ data: links })
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
    const link = await prisma.friendLink.create({ data: body })
    revalidatePath('/')
    return NextResponse.json({ data: link }, { status: 201 })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
