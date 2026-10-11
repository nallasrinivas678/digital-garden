import type { PortfolioProfile } from '../types'
import { GithubIcon, LinkedinIcon, DocumentIcon, ArrowRightIcon } from './icons'

/** Name, title, bio, and contact/resume links. Reused at the top of Home. */
export default function Hero({ profile }: { profile: PortfolioProfile }) {
  const socials = [
    profile.github_url && { href: profile.github_url, label: 'GitHub', icon: GithubIcon },
    profile.linkedin_url && { href: profile.linkedin_url, label: 'LinkedIn', icon: LinkedinIcon },
  ].filter(Boolean) as { href: string; label: string; icon: typeof GithubIcon }[]

  return (
    <section className="relative -mx-4 px-4 pt-4 pb-2 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -left-10 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl"
      />

      <div className="relative space-y-5 animate-fade-up">
        <p className="font-mono text-sm text-brand-600">Hi, my name is</p>
        <h1 className="text-gradient text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          {profile.display_name}.
        </h1>
        {profile.title && (
          <p className="text-xl sm:text-2xl font-semibold text-slate-500">{profile.title}.</p>
        )}
        {profile.bio && <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600">{profile.bio}</p>}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {profile.resume_url && (
            <a
              href={profile.resume_url}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-500 hover:-translate-y-0.5 transition-all"
            >
              <DocumentIcon className="w-4 h-4" />
              Résumé
            </a>
          )}
          <a
            href="#projects"
            className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-400 hover:text-brand-600 hover:-translate-y-0.5 transition-all"
          >
            View projects
            <ArrowRightIcon className="w-4 h-4" />
          </a>
        </div>

        {socials.length > 0 && (
          <div className="flex items-center gap-4 pt-2 text-slate-400">
            {socials.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                title={label}
                className="hover:text-brand-600 hover:-translate-y-0.5 transition-all"
              >
                <Icon />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
