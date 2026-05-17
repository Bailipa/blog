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
      <div className="projects-track" id="projectsTrack">
        {projects.map((project, i) => (
          <ProjectCard key={project.slug} project={project} index={i} />
        ))}
        {projects.map((project, i) => (
          <ProjectCard key={`clone-${project.slug}`} project={project} index={i} />
        ))}
      </div>
    </div>
  )
}
