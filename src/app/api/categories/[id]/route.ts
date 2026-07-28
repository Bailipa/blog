import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const runtime = 'nodejs'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { revalidatePath } from 'next/cache'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const category = await prisma.category.update({ where: { id }, data: body })
    revalidatePath('/')
    return NextResponse.json({ data: category })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.category.delete({ where: { id } })
    revalidatePath('/')
    return NextResponse.json({ data: { id } })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
