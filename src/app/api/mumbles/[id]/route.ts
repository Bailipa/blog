import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
export const runtime = 'nodejs'
import { revalidatePath } from 'next/cache'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await req.json()
    const mumble = await prisma.mumble.update({ where: { id }, data: { content: body.content } })
    revalidatePath('/')
    return NextResponse.json({ data: mumble })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await prisma.mumble.delete({ where: { id } })
    revalidatePath('/')
    return NextResponse.json({ data: { id } })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
