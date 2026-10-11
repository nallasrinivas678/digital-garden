import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import ProtectedRoute from './components/ProtectedRoute'
import RequireProfile from './components/RequireProfile'
import PublicProfileLayout from './components/PublicProfileLayout'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import ManagePortfolio from './pages/ManagePortfolio'
import GardenEditor from './pages/GardenEditor'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Projects from './pages/Projects'
import GardenIndex from './pages/GardenIndex'
import NotePublic from './pages/NotePublic'
import PrivacyPolicy from './pages/PrivacyPolicy'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <RequireProfile>
                    <Layout />
                  </RequireProfile>
                </ProtectedRoute>
              }
            >
              <Route path="/app" element={<Dashboard />} />
              <Route path="/app/portfolio" element={<ManagePortfolio />} />
              <Route path="/app/garden/:id" element={<GardenEditor />} />
            </Route>
            <Route path="/:username" element={<PublicProfileLayout />}>
              <Route index element={<Home />} />
              <Route path="projects" element={<Projects />} />
              <Route path="notes" element={<GardenIndex />} />
              <Route path="notes/:slug" element={<NotePublic />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
