import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sendMessage, createSession, getSessions, getSessionHistory } from '../api/client'
import Sidebar from '../components/Sidebar'
import ChatMessage, { TypingIndicator } from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import QuickActions from '../components/QuickActions'
import Toast from '../components/Toast'
import { ArrowLeft, CalendarDays, FileSearch } from 'lucide-react'

/**
 * Convert a send payload into a human-friendly label for the chat bubble.
 * Button clicks send JSON like `{"action":"submit_leave"}` which is ugly to show.
 * Plain text / chip selections pass through unchanged.
 */
function getDisplayText(text) {
  if (typeof text !== 'string' || !text.startsWith('{')) return text
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed.action === 'string') {
      return parsed.action
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim()
    }
  } catch {
    // not JSON — fall through
  }
  return text
}

const AGENT_CONFIG = {
  'leave-attendance': {
    title: 'Leave & Attendance Agent',
    subtitle: 'Leave, On-Duty, Regularization, Balance, Holidays, Salary',
    icon: CalendarDays,
    gradient: 'from-blue-500 to-indigo-600',
    placeholder: 'Type your message... (e.g., apply leave, check balance, WFH request)',
    inputHint: 'Leave | On-Duty | Regularization | Balance | Holidays | Salary',
  },
  'policy': {
    title: 'Policy Agent',
    subtitle: 'Company policies, HR rules, guidelines & benefits',
    icon: FileSearch,
    gradient: 'from-violet-500 to-purple-600',
    placeholder: 'Ask about any company policy... (e.g., leave policy kya hai?)',
    inputHint: 'Leave Policy | HR Rules | Guidelines | Benefits',
  },
}

export default function Chat({ user, onLogout }) {
  const { agentType } = useParams()
  const navigate = useNavigate()
  const config = AGENT_CONFIG[agentType] || AGENT_CONFIG['leave-attendance']
  const AgentIcon = config.icon

  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [toast, setToast] = useState(null)
  const messagesEndRef = useRef(null)
  const initialized = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const result = await getSessions(user.userId)
      const sessionList = result.sessions || result || []
      setSessions(Array.isArray(sessionList) ? sessionList : [])
      if (!Array.isArray(sessionList) || sessionList.length === 0) {
        await handleNewSession()
      }
    } catch {
      await handleNewSession()
    }
  }

  const handleNewSession = async () => {
    try {
      const result = await createSession({
        userId: user.userId,
        sessionName: `${config.title} - ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      })
      const newSessionId = result.sessionId || result.session_id
      if (newSessionId) {
        const newSession = {
          sessionId: newSessionId,
          sessionName: result.sessionName || result.session_name || config.title,
        }
        setSessions((prev) => [newSession, ...prev])
        setActiveSessionId(newSessionId)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }

  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId)
    setMessages([])
    try {
      const result = await getSessionHistory(user.userId, sessionId)
      const history = result.history || result.messages || []
      if (Array.isArray(history)) {
        setMessages(
          history.map((msg, i) => {
            const raw = msg.message || msg.content || msg.text
            return {
              id: `hist-${i}`,
              role: msg.role,
              text: msg.role === 'user' ? getDisplayText(raw) : raw,
              timestamp: msg.timestamp,
            }
          })
        )
      }
    } catch {
      // ignore
    }
  }

  const handleSend = useCallback(
    async (text) => {
      if (!text.trim() || loading) return

      let sessionId = activeSessionId
      if (!sessionId) {
        try {
          const result = await createSession({
            userId: user.userId,
            sessionName: text.slice(0, 30),
          })
          sessionId = result.sessionId || result.session_id
          setActiveSessionId(sessionId)
          setSessions((prev) => [
            { sessionId, sessionName: text.slice(0, 30) },
            ...prev,
          ])
        } catch {
          return
        }
      }

      const userMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: getDisplayText(text),
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      try {
        const result = await sendMessage({
          userId: user.userId,
          message: text,
          sessionId,
        })
        const botMsg = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          text: result.agentMessage || result.reply || result.response || 'No response received.',
          timestamp: new Date().toISOString(),
          resources: result.resources || null,
          data: result.ui || result.data || null,
        }
        setMessages((prev) => [...prev, botMsg])

        // Show toast if backend sent one
        if (result.toast) {
          setToast(result.toast)
        }
      } catch (err) {
        const errorMsg = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `Error: ${err.message || 'Something went wrong. Please try again.'}`,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setLoading(false)
      }
    },
    [activeSessionId, loading, user.userId]
  )

  const showQuickActions = messages.length === 0

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Toast notifications */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onLogout={onLogout}
        user={user}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header - Glassmorphism */}
        <div className="glass border-b border-gray-200/50 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/agents')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all active:scale-95"
              title="Back to agents"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md`}>
              <AgentIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">{config.title}</h1>
              <p className="text-xs text-gray-500">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-online-pulse" />
            <span className="text-xs text-gray-500 font-medium">Online</span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-grid">
          {showQuickActions ? (
            <QuickActions agentType={agentType} onAction={handleSend} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isLast={idx === messages.length - 1 && !loading}
                  onActionSelect={handleSend}
                />
              ))}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={loading}
          placeholder={config.placeholder}
          hint={config.inputHint}
        />
      </div>
    </div>
  )
}
