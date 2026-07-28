import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const runtime = 'nodejs'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { revalidatePath } from 'next/cache'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10))
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const featured = searchParams.get('featured')
    const session = await auth()
    const isAdmin = !!session?.user?.isAdmin

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    else if (!isAdmin) where.status = 'PUBLISHED'
    if (categoryId) where.categoryId = categoryId
    if (featured === 'true') where.featured = true

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, tags: { include: { tag: true } } },
      }),
      prisma.post.count({ where }),
    ])

    return NextResponse.json({
      data: posts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const post = await prisma.post.create({
      data: {
        title: body.title,
        slug: body.slug,
        content: body.content || '',
        excerpt: body.excerpt,
        coverImage: body.coverImage,
        status: body.status || 'DRAFT',
        featured: body.featured || false,
        publishedAt: body.status === 'PUBLISHED' ? new Date() : null,
        categoryId: body.categoryId || null,
        tags: body.tagIds?.length
          ? { create: body.tagIds.map((id: string) => ({ tagId: id })) }
          : undefined,
      },
      include: { category: true, tags: { include: { tag: true } } },
    })

    revalidatePath('/')
    revalidatePath('/blog')
    return NextResponse.json({ data: post }, { status: 201 })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
