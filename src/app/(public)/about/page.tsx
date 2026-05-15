import { FriendLinks } from '@/components/layout/FriendLinks'

export default function AboutPage() {
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
          <p>热爱探索技术与艺术的交汇点。专注于全栈开发、交互设计与创意编程。</p>
          <p>相信代码可以是一种表达方式，每一行都是对完美的追求。热衷于开源社区，持续学习中。</p>
        </div>
        <div className="about-skills">
          <div className="about-skill-group">
            <h3>前端</h3>
            <div className="about-skill-tags">
              <span>React</span><span>Next.js</span><span>TypeScript</span><span>Tailwind CSS</span>
            </div>
          </div>
          <div className="about-skill-group">
            <h3>后端</h3>
            <div className="about-skill-tags">
              <span>Node.js</span><span>Python</span><span>Prisma</span><span>PostgreSQL</span>
            </div>
          </div>
          <div className="about-skill-group">
            <h3>创意</h3>
            <div className="about-skill-tags">
              <span>SVG 动画</span><span>WebGL</span><span>交互设计</span><span>数据可视化</span>
            </div>
          </div>
        </div>
      </div>
      <FriendLinks />
    </section>
  )
}
