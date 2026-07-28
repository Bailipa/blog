import prisma from '@/lib/prisma'
import { markdownToHtml } from '@/lib/markdown'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'
import { FriendLinks } from '@/components/layout/FriendLinks'

export const dynamic = 'force-dynamic'

const defaultContent = `热爱探索技术与艺术的交汇点。专注于全栈开发、交互设计与创意编程。

相信代码可以是一种表达方式，每一行都是对完美的追求。热衷于开源社区，持续学习中。`

const defaultSkills = [
  { category: '前端', items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'] },
  { category: '后端', items: ['Node.js', 'Python', 'Prisma', 'PostgreSQL'] },
  { category: '创意', items: ['SVG 动画', 'WebGL', '交互设计', '数据可视化'] },
]

interface SkillGroup {
  category: string
  items: string[]
}

export default async function AboutPage() {
  const configs = await prisma.siteConfig.findMany()
  const configMap: Record<string, string> = {}
  for (const c of configs) configMap[c.key] = c.value

  const contentMd = configMap.about_content || defaultContent
  const contentHtml = await markdownToHtml(contentMd)

  let skills: SkillGroup[] = defaultSkills
  if (configMap.about_skills) {
    try {
      const parsed = JSON.parse(configMap.about_skills)
      if (Array.isArray(parsed)) skills = parsed
    } catch {}
  }

  return (
    <section className="snap-page about-page" id="about">
      <div className="about-container">
        <div className="about-avatar">
          <div className="about-avatar-ring">
            <span>辉</span>
          </div>
        </div>
        <h1 className="about-name">辉洋</h1>
        <p className="about-role">Full-Stack Developer &amp; Creative Technologist</p>
        <div className="about-bio">
          <MarkdownRenderer html={contentHtml} />
        </div>
        <div className="about-skills">
          {skills.map((group, i) => (
            <div key={i} className="about-skill-group">
              <h3>{group.category}</h3>
              <div className="about-skill-tags">
                {group.items.map((tag, j) => (
                  <span key={j}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <FriendLinks />
    </section>
  )
}
