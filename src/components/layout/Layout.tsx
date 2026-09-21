import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-surface-base text-slate-800">
      <Navbar />
      <main className="pt-14">
        <Outlet />
      </main>
      <footer className="border-t border-surface-border mt-20 py-8 text-center text-xs text-slate-500 font-mono">
        🌱 <span className="text-brand-600">digital garden</span>
      </footer>
    </div>
  )
}
