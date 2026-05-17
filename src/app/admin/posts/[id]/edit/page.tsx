import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import PostEditor from '@/components/admin/PostEditor'

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.isAdmin) redirect('/admin/login')

  const { id } = await params
  const post = await prisma.post.findUnique({
    where: { id },
    include: { tags: true },
  })

  if (!post) redirect('/admin/posts')

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">编辑文章</h1>
      <PostEditor
        initialData={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt || '',
          categoryId: post.categoryId || '',
          tagIds: post.tags.map((t) => t.tagId),
          status: post.status,
        }}
      />
    </div>
  )
}
