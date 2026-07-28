import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const runtime = 'nodejs'
import { auth } from '@/lib/auth'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { revalidatePath } from 'next/cache'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        category: true,
        tags: { include: { tag: true } },
        translations: true,
      },
    })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: post })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

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

    await prisma.postTag.deleteMany({ where: { postId: id } })

    const post = await prisma.post.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug,
        content: body.content,
        excerpt: body.excerpt,
        coverImage: body.coverImage,
        status: body.status,
        featured: body.featured,
        publishedAt:
          body.status === 'PUBLISHED'
            ? body.publishedAt || new Date()
            : body.publishedAt,
        categoryId: body.categoryId || null,
        tags: body.tagIds?.length
          ? { create: body.tagIds.map((id: string) => ({ tagId: id })) }
          : undefined,
      },
      include: { category: true, tags: { include: { tag: true } } },
    })

    revalidatePath('/')
    revalidatePath('/blog')
    return NextResponse.json({ data: post })
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
    const post = await prisma.post.findUnique({ where: { id }, select: { slug: true } })
    await prisma.post.delete({ where: { id } })
    revalidatePath('/')
    revalidatePath('/blog')
    if (post?.slug) revalidatePath(`/blog/${post.slug}`)
    return NextResponse.json({ data: { id } })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
