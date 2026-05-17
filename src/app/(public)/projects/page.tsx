import prisma from '@/lib/prisma'
import ProjectGrid from '@/components/projects/ProjectGrid'

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
  })

  return (
    <section className="projects-page">
      <h1 className="section-title">作品</h1>
      {projects.length === 0 ? (
        <p className="admin-empty" style={{ textAlign: 'center', padding: '80px 0' }}>暂无作品</p>
      ) : (
        <ProjectGrid projects={projects} />
      )}
    </section>
  )
}
