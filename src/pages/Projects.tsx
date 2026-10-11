import { useOutletContext } from 'react-router-dom'
import ProjectCard from '../components/ProjectCard'
import { usePublicProjects } from '../lib/hooks'
import type { PortfolioProfile } from '../types'

/** One user's full project showcase, served at "/:username/projects". */
export default function Projects() {
  const profile = useOutletContext<PortfolioProfile>()
  const { data: projects, isLoading } = usePublicProjects(profile.user_id)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14 space-y-6">
      <header>
        <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Portfolio</p>
        <h1 className="text-3xl font-semibold text-slate-900 mt-1">Projects</h1>
      </header>
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !projects || projects.length === 0 ? (
        <p className="text-sm text-slate-500">No projects listed yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} username={profile.username} />
          ))}
        </div>
      )}
    </div>
  )
}
