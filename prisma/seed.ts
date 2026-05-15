import prisma from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const userCount = await prisma.user.count()
  if (userCount > 0) {
    console.log('Database already seeded, skipping.')
    return
  }

  const password = await bcrypt.hash('admin123', 12)
  await prisma.user.create({
    data: { username: 'admin', password, isAdmin: true },
  })
  console.log('Admin user created: admin / admin123')

  const categories = [
    { name: 'Next.js', slug: 'nextjs', description: 'Next.js 相关文章' },
    { name: 'TypeScript', slug: 'typescript', description: 'TypeScript 类型系统' },
    { name: 'Docker', slug: 'docker', description: '容器化与 DevOps' },
    { name: 'React', slug: 'react', description: 'React 生态' },
  ]
  for (const cat of categories) await prisma.category.create({ data: cat })

  const tags = [
    { name: '前端', slug: 'frontend' },
    { name: '后端', slug: 'backend' },
    { name: '架构', slug: 'architecture' },
    { name: '教程', slug: 'tutorial' },
    { name: '开源', slug: 'opensource' },
  ]
  for (const tag of tags) await prisma.tag.create({ data: tag })

  const samplePosts = [
    { title: '用 Next.js 16 搭建现代博客', slug: 'nextjs-16-blog', content: '# 用 Next.js 16 搭建现代博客\n\n从零开始，使用 App Router、Server Components 打造高性能个人博客。', excerpt: '从零开始打造高性能个人博客。', status: 'PUBLISHED', featured: true, publishedAt: new Date('2026-05-10'), catSlug: 'nextjs', tagSlugs: ['frontend', 'tutorial'] },
    { title: 'TypeScript 5.x 高级类型体操', slug: 'typescript-5-advanced-types', content: '# TypeScript 5.x 高级类型体操\n\n深入探讨条件类型、模板字面量类型和递归类型。', excerpt: '深入探讨条件类型、模板字面量类型和递归类型。', status: 'PUBLISHED', featured: false, publishedAt: new Date('2026-05-05'), catSlug: 'typescript', tagSlugs: ['frontend', 'tutorial'] },
    { title: '容器化部署最佳实践', slug: 'docker-best-practices', content: '# 容器化部署最佳实践\n\n多阶段构建、健康检查和 docker-compose 编排。', excerpt: '多阶段构建、健康检查和 docker-compose 编排。', status: 'PUBLISHED', featured: false, publishedAt: new Date('2026-04-28'), catSlug: 'docker', tagSlugs: ['backend', 'architecture'] },
  ]

  for (const post of samplePosts) {
    const cat = await prisma.category.findUnique({ where: { slug: post.catSlug } })
    const tagRecords = await prisma.tag.findMany({ where: { slug: { in: post.tagSlugs } } })
    await prisma.post.create({
      data: {
        title: post.title, slug: post.slug, content: post.content, excerpt: post.excerpt,
        status: post.status, featured: post.featured, publishedAt: post.publishedAt,
        categoryId: cat?.id,
        tags: { create: tagRecords.map((t) => ({ tagId: t.id })) },
      },
    })
  }
  console.log('Sample posts created:', 3)

  const projects = [
    { name: 'EZTor', slug: 'eztor', description: 'AI 驱动的英语翻译与词汇记忆工具', url: 'https://dogeggcode.cyou', techStack: 'Next.js 16,Prisma,PostgreSQL,OpenAI,Docker', featured: true, sortOrder: 0 },
    { name: 'PixelForge', slug: 'pixelforge', description: '基于 Canvas 的像素艺术创作工具', url: '#', techStack: 'React,Canvas API,Web Workers', featured: false, sortOrder: 1 },
  ]
  for (const p of projects) await prisma.project.create({ data: p })

  await prisma.friendLink.create({
    data: { name: 'EZTor', url: 'https://dogeggcode.cyou', description: '智能英语学习平台', sortOrder: 0 },
  })
  console.log('Seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
