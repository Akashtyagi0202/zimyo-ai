import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import AgentSelect from './pages/AgentSelect'
import Chat from './pages/Chat'
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

  return (
    <DarkModeProvider>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/agents" replace /> : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/agents"
          element={
            user ? <AgentSelect user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/chat/:agentType"
          element={
            user ? <Chat user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to={user ? "/agents" : "/login"} replace />} />
      </Routes>
    </DarkModeProvider>
  )
}
