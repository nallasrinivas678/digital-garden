import Tasks from './Tasks'
import UpcomingAppointments from './UpcomingAppointments'
import Career from './Career'
import GardenList from './GardenList'
import TodayBrief from '../components/TodayBrief'
import { featureFlags } from '../lib/featureFlags'
import { getUserDisplayName, useAuth } from '../lib/auth'

// The landing page: everything in one scrollable view instead of separate
// tabs. A "Welcome, <name>" greeting (from the Google profile) sits above
// TodayBrief, a slim "what needs attention" summary. Below that, a single
// linear column in reading order: Tasks, Upcoming (appointments/outings),
// Career, Garden. Career and Garden are behind feature flags (see
// lib/featureFlags.ts) and may not render.
export default function Dashboard() {
  const { user } = useAuth()
  const { full: name } = getUserDisplayName(user)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-8 sm:space-y-10">
      {name && (
        <header>
          <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Welcome</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">{name}</h1>
        </header>
      )}
      <TodayBrief />
      <Tasks />
      <UpcomingAppointments />
      {featureFlags.jobTracker && <Career />}
      {featureFlags.notes && <GardenList />}
    </div>
  )
}
