import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sendMessage, createSession, getSessions, getSessionHistory, getWorkflow } from '../api/client'
import Sidebar from '../components/Sidebar'
import ChatMessage, { TypingIndicator } from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import QuickActions from '../components/QuickActions'
import Toast from '../components/Toast'
import { ArrowLeft, CalendarDays, FileSearch, UserPlus, Sun, Moon, GitBranch } from 'lucide-react'
import useDarkMode from '../hooks/useDarkMode'

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
  'onboarding': {
    title: 'Onboarding Agent',
    subtitle: 'CTC computation, offer letter, candidate onboarding',
    icon: UserPlus,
    gradient: 'from-amber-500 to-orange-600',
    placeholder: "Type your message... (e.g., akash ka CTC compute kro)",
    inputHint: 'CTC Compute | Offer Letter | Documents | Verification',
  },
}

export default function Chat({ user, onLogout }) {
  const { agentType } = useParams()
  const navigate = useNavigate()
  const config = AGENT_CONFIG[agentType] || AGENT_CONFIG['leave-attendance']
  const AgentIcon = config.icon
  const { isDark, toggle: toggleDark } = useDarkMode()

  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeWorkflow, setActiveWorkflow] = useState(null)
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

  useEffect(() => {
    if (agentType !== 'onboarding' || !user?.userId) return
    let cancelled = false
    getWorkflow(user.userId)
      .then((wf) => {
        if (cancelled) return
        setActiveWorkflow(wf && wf.id ? wf : null)
      })
      .catch(() => { if (!cancelled) setActiveWorkflow(null) })
    return () => { cancelled = true }
  }, [agentType, user?.userId, messages.length])

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
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
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
        {/* Chat Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/50 px-5 py-3 flex items-center justify-between sticky top-0 z-10 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/agents')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all active:scale-95"
              title="Back to agents"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-600/20 ring-1 ring-indigo-500/10">
              <AgentIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[13px] font-medium text-slate-900 dark:text-slate-100 tracking-tight">{config.title}</h1>
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[9px] font-medium uppercase tracking-wider">AI</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agentType === 'onboarding' && (
              <button
                onClick={() => navigate('/settings')}
                title={activeWorkflow ? 'Change workflow in Settings' : 'Pick a workflow in Settings'}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all active:scale-95 ${
                  activeWorkflow
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                    : 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                }`}
              >
                <GitBranch className="w-3 h-3" />
                <span className="text-[10px] font-medium max-w-[160px] truncate">
                  {activeWorkflow
                    ? (activeWorkflow.name || `Workflow ${activeWorkflow.id}`)
                    : 'No workflow set'}
                </span>
              </button>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-online-pulse" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">Online</span>
            </div>
            <button
              onClick={toggleDark}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-yellow-400 transition-all active:scale-95"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-grid">
          {showQuickActions ? (
            <QuickActions agentType={agentType} onAction={handleSend} />
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
          onError={setToast}
        />
      </div>
    </div>
  )
}
