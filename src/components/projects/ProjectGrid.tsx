import ProjectCard from './ProjectCard'

interface ProjectGridProps {
  projects: Array<{
    name: string
    slug: string
    description: string
    url: string
    repoUrl: string | null
    techStack: string
    featured: boolean
  }>
}

export default function ProjectGrid({ projects }: ProjectGridProps) {
  return (
    <div className="projects-grid">
      {projects.map((project, i) => (
        <ProjectCard key={project.slug} project={project} index={i} />
      ))}
    </div>
  )
}
