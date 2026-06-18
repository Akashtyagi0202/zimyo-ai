import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import AgentSelect from './pages/AgentSelect'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Candidates from './pages/Candidates'
import CandidateDetail from './pages/CandidateDetail'
import Dashboard from './pages/Dashboard'
import MissionControl from './pages/MissionControl'
import Approvals from './pages/Approvals'
import Activity from './pages/Activity'
import OnboardingShell from './components/OnboardingShell'
import { DarkModeProvider } from './hooks/useDarkMode'

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('zimyo_user')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('zimyo_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('zimyo_user')
    }
  }, [user])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('zimyo_user')
  }

  // Single flat route tree. The portal is admin-only — every logged-in
  // user is an admin. New admin views (Candidates / Mission Control /
  // Approvals / Activity) sit alongside Chat / Settings / AgentSelect
  // and reuse the same slim-header chrome via <PageShell/>. No /admin
  // prefix, no sidebar shell. See project_portal_scope memory.
  const requireUser = (element) => (user ? element : <Navigate to="/login" replace />)

  return (
    <DarkModeProvider>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/agents" replace /> : <Login onLogin={handleLogin} />}
        />

        {/* Hub */}
        <Route path="/agents"
          element={requireUser(<AgentSelect user={user} onLogout={handleLogout} />)} />

        {/* Existing surfaces (unchanged) */}
        <Route path="/chat/:agentType"
          element={requireUser(<Chat user={user} onLogout={handleLogout} />)} />
        <Route path="/settings"
          element={requireUser(<Settings user={user} />)} />

        {/* Onboarding-admin surfaces — flat routes, but wrapped in
            OnboardingShell so the Sidebar from /chat/onboarding persists
            and the user can pivot between Assistant / Mission Control /
            Candidates / Approvals / Activity from one panel. */}
        <Route path="/dashboard"
          element={requireUser(
            <OnboardingShell user={user} onLogout={handleLogout}>
              <Dashboard user={user} />
            </OnboardingShell>
          )} />
        <Route path="/mission-control"
          element={requireUser(
            <OnboardingShell user={user} onLogout={handleLogout}>
              <MissionControl user={user} />
            </OnboardingShell>
          )} />
        <Route path="/candidates"
          element={requireUser(
            <OnboardingShell user={user} onLogout={handleLogout}>
              <Candidates user={user} />
            </OnboardingShell>
          )} />
        <Route path="/candidates/:candidateId"
          element={requireUser(
            <OnboardingShell user={user} onLogout={handleLogout}>
              <CandidateDetail user={user} />
            </OnboardingShell>
          )} />
        <Route path="/approvals"
          element={requireUser(
            <OnboardingShell user={user} onLogout={handleLogout}>
              <Approvals user={user} />
            </OnboardingShell>
          )} />
        <Route path="/activity"
          element={requireUser(
            <OnboardingShell user={user} onLogout={handleLogout}>
              <Activity user={user} />
            </OnboardingShell>
          )} />

        <Route path="*" element={<Navigate to={user ? "/agents" : "/login"} replace />} />
      </Routes>
    </DarkModeProvider>
  )
}
