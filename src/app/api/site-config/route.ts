import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const runtime = 'nodejs'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const configs = await prisma.siteConfig.findMany()
    const data: Record<string, string> = {}
    for (const c of configs) data[c.key] = c.value
    return NextResponse.json({ data })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as Record<string, unknown>
    const results: Record<string, string> = {}

    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string') {
        return NextResponse.json({ error: `Value for "${key}" must be a string` }, { status: 400 })
      }
      const config = await prisma.siteConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
      results[config.key] = config.value
    }

    revalidatePath('/')
    revalidatePath('/about')
    return NextResponse.json({ data: results })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
