import { Link, useOutletContext } from 'react-router-dom'
import Hero from '../components/Hero'
import ProjectCard from '../components/ProjectCard'
import PostListItem from '../components/PostListItem'
import { usePublicNotes, usePublicProjects } from '../lib/hooks'
import type { PortfolioProfile } from '../types'

/** One user's public landing/portfolio page, served at "/:username". */
export default function Home() {
  const profile = useOutletContext<PortfolioProfile>()
  const { data: projects } = usePublicProjects(profile.user_id)
  const { data: recentNotes } = usePublicNotes(profile.user_id, 3)
  const featured = (projects ?? []).slice(0, 3)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14 space-y-14">
      <Hero profile={profile} />

      {featured.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Featured projects</h2>
            <Link to={`/${profile.username}/projects`} className="text-sm text-brand-600 hover:underline">
              All projects →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {featured.map((p) => (
              <ProjectCard key={p.id} project={p} username={profile.username} />
            ))}
          </div>
        </section>
      )}

      {recentNotes && recentNotes.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Recent from the Garden</h2>
            <Link to={`/${profile.username}/notes`} className="text-sm text-brand-600 hover:underline">
              All posts →
            </Link>
          </div>
          <div className="divide-y divide-surface-border">
            {recentNotes.map((n) => (
              <PostListItem key={n.id} note={n} username={profile.username} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
