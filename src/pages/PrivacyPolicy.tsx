import { Link } from 'react-router-dom'

const LAST_UPDATED = 'August 9, 2026'
const CONTACT_EMAIL = 'nallasrinivas678@gmail.com'

/**
 * Public, unauthenticated privacy policy — required by Apple's App Store
 * Connect (and Google Play) as a live, reachable URL, not just a document.
 * Covers both the web app and the Expo mobile app; they share one Supabase
 * backend and the same data.
 */
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-surface-base text-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link to="/" className="font-mono text-xs text-brand-600 tracking-widest">
          🌱 digital garden
        </Link>

        <header className="mt-8 mb-8 space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Privacy Policy</h1>
          <p className="text-xs text-slate-500">Last updated: {LAST_UPDATED}</p>
        </header>

        <article className="prose-note space-y-6">
          <p>
            Digital Garden ("the app") is a personal productivity tool — tasks, a calendar,
            a job-application tracker, and a notes garden. This policy covers both the web app
            and the iOS app, which share the same account and the same data.
          </p>

          <section>
            <h2>What data is collected</h2>
            <ul>
              <li>
                <strong>Account info</strong> — when you sign in with Google, we receive your name,
                email address, and profile picture URL from Google. We don't see or store your
                Google password.
              </li>
              <li>
                <strong>Content you create</strong> — tasks, due dates, notes, and priorities;
                calendar appointments and outings; job application entries (company, role, status,
                contact details, compensation notes); and any notes you write in the Garden.
              </li>
            </ul>
            <p>We don't collect analytics, advertising identifiers, or location data.</p>
          </section>

          <section>
            <h2>How it's used</h2>
            <p>
              Solely to show your own data back to you inside the app. We don't sell it, share it
              with advertisers, or use it for anything beyond running the app.
            </p>
          </section>

          <section>
            <h2>Where it's stored</h2>
            <p>
              In a Supabase (PostgreSQL) database. Every table enforces Row Level Security, so your
              account can only ever read or write your own rows — nobody else's data, and no
              server-side dashboard, exposes your content to anyone but you.
            </p>
          </section>

          <section>
            <h2>Third parties</h2>
            <ul>
              <li>
                <strong>Google</strong> — used only for sign-in (OAuth). See{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                  Google's privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Supabase</strong> — hosts the database, authentication, and backend
                infrastructure. See{' '}
                <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">
                  Supabase's privacy policy
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2>Data retention and deletion</h2>
            <p>
              Your content is retained until you delete it yourself in the app, or until you delete
              your account. To request full account deletion, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> — all of your data will be
              permanently removed.
            </p>
          </section>

          <section>
            <h2>Children's privacy</h2>
            <p>
              This app is not directed at children and we do not knowingly collect data from anyone
              under 13.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              If this policy changes, the "Last updated" date above will change with it.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy or your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
