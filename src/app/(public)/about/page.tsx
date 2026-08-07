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

interface Experience {
  role: string
  org?: string
  period?: string
  description?: string
}

const defaultExperiences: Experience[] = []

const defaultSocialLinks = [
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'Email', url: 'mailto:hello@example.com' },
]

interface SocialLink {
  label: string
  url: string
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

  let experiences: Experience[] = defaultExperiences
  if (configMap.about_experiences) {
    try {
      const parsed = JSON.parse(configMap.about_experiences)
      if (Array.isArray(parsed)) experiences = parsed
    } catch {}
  }

  let socialLinks: SocialLink[] = defaultSocialLinks
  if (configMap.social_links) {
    try {
      const parsed = JSON.parse(configMap.social_links)
      if (Array.isArray(parsed)) socialLinks = parsed
    } catch {}
  }

  return (
    <section className="about-page">
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

        {experiences.length > 0 && (
          <div className="about-experiences">
            <h2 className="about-section-title">经历</h2>
            <ol className="about-timeline">
              {experiences.map((exp, i) => (
                <li key={i} className="about-timeline-item">
                  <span className="about-timeline-dot" aria-hidden />
                  <div className="about-timeline-body">
                    <div className="about-timeline-head">
                      <h3 className="about-timeline-role">{exp.role}</h3>
                      {exp.period && <span className="about-timeline-period">{exp.period}</span>}
                    </div>
                    {exp.org && <p className="about-timeline-org">{exp.org}</p>}
                    {exp.description && (
                      <p className="about-timeline-desc">{exp.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

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

        {socialLinks.length > 0 && (
          <div className="about-contact">
            <h2 className="about-section-title">联系我</h2>
            <div className="about-contact-links">
              {socialLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-contact-link"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <FriendLinks />
    </section>
  )
}
