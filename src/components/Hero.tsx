import type { PortfolioProfile } from '../types'

/** Name, title, bio, and contact/resume links. Reused at the top of Home. */
export default function Hero({ profile }: { profile: PortfolioProfile }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Portfolio</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mt-1">{profile.display_name}</h1>
        {profile.title && <p className="text-base sm:text-lg text-slate-600 mt-1">{profile.title}</p>}
      </div>
      {profile.bio && <p className="max-w-2xl text-sm sm:text-base text-slate-600">{profile.bio}</p>}
      <div className="flex flex-wrap items-center gap-4 text-sm font-mono">
        {profile.github_url && (
          <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            GitHub
          </a>
        )}
        {profile.linkedin_url && (
          <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            LinkedIn
          </a>
        )}
        {profile.resume_url && (
          <a href={profile.resume_url} className="text-brand-600 hover:underline">
            Resume
          </a>
        )}
      </div>
    </section>
  )
}
