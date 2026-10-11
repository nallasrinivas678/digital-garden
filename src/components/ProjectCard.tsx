import { Link } from 'react-router-dom'
import type { PortfolioProject } from '../types'

/** Reusable project card: name, stack badges, links, highlights. */
export default function ProjectCard({ project, username }: { project: PortfolioProject; username: string }) {
  return (
    <article className="card-glow rounded-xl bg-surface-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          {project.live_url && (
            <a href={project.live_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
              Live
            </a>
          )}
          {project.repo_url && (
            <a href={project.repo_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
              Code
            </a>
          )}
        </div>
      </div>

      {project.description && <p className="text-sm text-slate-600">{project.description}</p>}

      {project.stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.stack.map((s) => (
            <span key={s} className="text-xs rounded-full bg-surface-hover px-2 py-0.5 text-slate-600">
              {s}
            </span>
          ))}
        </div>
      )}

      {project.highlights.length > 0 && (
        <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
          {project.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}

      {project.related_post_slug && (
        <Link
          to={`/${username}/notes/${project.related_post_slug}`}
          className="inline-block text-sm text-brand-600 hover:underline"
        >
          Read the deep-dive →
        </Link>
      )}
    </article>
  )
}
