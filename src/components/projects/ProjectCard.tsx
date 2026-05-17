const emojiList = ['📚', '🎮', '📊', '🔧', '🚀', '🎨', '⚡', '🛠️', '📡', '🧩']
const techIcons: Record<string, string> = {
  nextjs: '▼', prisma: '▣', postgresql: '▤', openai: '✦', docker: '▥',
  react: '◈', canvas: '▣', webworkers: '▤', gifjs: '▥',
  websocket: '◈', d3js: '▣', redis: '▤',
}

function getEmoji(name: string, index: number): string {
  return emojiList[index % emojiList.length]
}

interface ProjectCardProps {
  project: {
    name: string
    slug: string
    description: string
    url: string
    repoUrl: string | null
    techStack: string
    featured: boolean
  }
  index?: number
}

export default function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const techs = project.techStack.split(',').map((t) => t.trim())

  return (
    <article className="project-card">
      <div className="project-preview">
        <span className="project-emoji">{getEmoji(project.name, index)}</span>
      </div>
      <div className="project-info">
        <h3 className="project-card-name">{project.name}</h3>
        {project.featured && <span className="project-card-featured">精选</span>}
        <p className="project-card-desc">{project.description}</p>
        <div className="project-card-techs">
          {techs.map((tech) => (
            <span key={tech} className="project-card-tech">
              {tech}
            </span>
          ))}
        </div>
        <div className="project-card-links">
          <a href={project.url} className="project-card-link" target="_blank" rel="noopener noreferrer">
            查看项目 →
          </a>
          {project.repoUrl && (
            <a href={project.repoUrl} className="project-card-link" target="_blank" rel="noopener noreferrer">
              源代码
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
