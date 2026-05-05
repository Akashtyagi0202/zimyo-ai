import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sendMessageStream, createSession, getSessions, getSessionHistory, getWorkflow, getPolicyStatus, rateMessage } from '../api/client'
import Sidebar from '../components/Sidebar'
import ChatMessage, { TypingIndicator } from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import QuickActions from '../components/QuickActions'
import Toast from '../components/Toast'
import { ArrowLeft, CalendarDays, FileSearch, UserPlus, Sun, Moon, GitBranch, MoreHorizontal } from 'lucide-react'
import useDarkMode from '../hooks/useDarkMode'

/**
 * Convert a send payload into a human-friendly label for the chat bubble.
 * Button clicks send JSON like `{"action":"submit_leave"}` which is ugly to show.
 * Plain text / chip selections pass through unchanged.
 */
/**
 * Policy-agent readiness chip for the chat header. Rendered only on the policy page.
 * Shows the current ingestion state (polled from /policy-status) so the user
 * knows whether to expect real answers or "try again in a minute".
 */
function PolicyStatusChip({ status, processed, total, count }) {
  const st = status || 'checking'
  const styleByStatus = {
    checking:   'bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20 text-slate-600 dark:text-slate-400',
    completed:  'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    processing: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse',
    failed:     'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-300',
    idle:       'bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20 text-slate-600 dark:text-slate-400',
    unknown:    'bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20 text-slate-600 dark:text-slate-400',
  }
  const labelByStatus = {
    checking:   'Checking policies…',
    completed:  count ? `Policies ready · ${count}` : 'Policies ready',
    processing: total ? `Indexing ${processed}/${total}` : 'Indexing policies…',
    failed:     'Policy indexing failed',
    idle:       'Policies not loaded',
    unknown:    'Policy status unknown',
  }
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${styleByStatus[st] || styleByStatus.checking}`}
      title={st === 'failed' ? 'Re-login with loadPolicies=true' : undefined}
    >
      <FileSearch className="w-3 h-3" />
      <span className="text-[10px] font-medium max-w-[180px] truncate">
        {labelByStatus[st] || labelByStatus.checking}
      </span>
    </div>
  )
}

/**
 * Convert a LangGraph node name into a short human label for the typing indicator.
 * Backend may also pass an explicit `label` which takes precedence.
 */
function nodeLabel(node) {
  if (!node) return 'Thinking…'
  return node
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() + '…'
}

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
    placeholder: 'Ask about any company policy... (e.g., what is the leave policy?)',
    inputHint: 'Leave Policy | HR Rules | Guidelines | Benefits',
  },
  'onboarding': {
    title: 'Onboarding Agent',
    subtitle: 'CTC computation, offer letter, candidate onboarding',
    icon: UserPlus,
    gradient: 'from-amber-500 to-orange-600',
    placeholder: "Type your message... (e.g., compute CTC for Akash)",
    inputHint: 'CTC Compute | Offer Letter | Documents | Verification',
  },
}

export default function Chat({ user, onLogout }) {
  const { agentType } = useParams()
  const navigate = useNavigate()
  const config = AGENT_CONFIG[agentType] || AGENT_CONFIG['leave-attendance']
  const { isDark, toggle: toggleDark } = useDarkMode()

  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [phaseLabel, setPhaseLabel] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeWorkflow, setActiveWorkflow] = useState(null)
  const [policyStatus, setPolicyStatus] = useState(null)
  // replyContext: when set, the next outgoing message references this earlier
  // message so the backend can prepend its text into the router/agent prompt.
  // Cleared automatically after a successful send.
  const [replyContext, setReplyContext] = useState(null)   // { messageId, text, role }
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

  // Policy agent: poll ingestion status so user knows when RAG is ready.
  // Stops polling once status terminates (completed/failed).
  useEffect(() => {
    if (agentType !== 'policy' || !user?.userId) return
    let cancelled = false
    let timer = null

    const tick = async () => {
      try {
        const s = await getPolicyStatus(user.userId)
        if (cancelled) return
        setPolicyStatus(s)
        const terminal = s?.status === 'completed' || s?.status === 'failed'
        if (!terminal) timer = setTimeout(tick, 5000)
      } catch {
        if (!cancelled) setPolicyStatus({ status: 'unknown' })
      }
    }
    tick()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [agentType, user?.userId])

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
      setPhaseLabel('Samajh raha hoon…')

      // Stable id for the streaming bubble; created lazily on first token/ui_partial.
      const streamId = `stream-${Date.now()}`
      let streamingCreated = false

      // Idempotent: create an empty streaming bubble on first signal, drop typing.
      // Content updates (text/data) happen in the caller's follow-up setState so
      // React batching doesn't cause duplication.
      const ensureStreamBubble = () => {
        if (streamingCreated) return
        streamingCreated = true
        setLoading(false)
        setPhaseLabel('')
        setMessages((prev) => [
          ...prev,
          {
            id: streamId,
            role: 'assistant',
            text: '',
            timestamp: new Date().toISOString(),
            streaming: true,
          },
        ])
      }

      // Snapshot + clear reply context up-front so a slow stream doesn't carry
      // it into a subsequent message if user types before this one finishes.
      const replyToMessageId = replyContext?.messageId || null
      setReplyContext(null)

      try {
        await sendMessageStream(
          { userId: user.userId, message: text, sessionId, replyToMessageId },
          {
            onPhase: (p) => {
              setPhaseLabel(p.label || nodeLabel(p.node))
            },
            onUiPartial: (partial) => {
              ensureStreamBubble()
              setMessages((prev) =>
                prev.map((m) => (m.id === streamId ? { ...m, data: partial } : m))
              )
            },
            onToken: ({ t }) => {
              if (!t) return
              ensureStreamBubble()
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId ? { ...m, text: (m.text || '') + t } : m
                )
              )
            },
            onTrace: (trace) => {
              // Backend only emits this when TRACE=true. Append to the
              // streaming bubble so the user sees a live-updating panel.
              ensureStreamBubble()
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId
                    ? { ...m, traces: [...(m.traces || []), trace] }
                    : m
                )
              )
            },
            onFinal: (result) => {
              const finalText =
                result.agentMessage || result.reply || result.response || 'No response received.'
              const finalData = result.ui || result.data || null
              const resources = result.resources || null

              if (streamingCreated) {
                // Replace the streaming bubble's payload with the final one.
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamId
                      ? {
                          ...m,
                          text: finalText,
                          data: finalData,
                          resources,
                          streaming: false,
                          messageId: result.messageId || null,
                        }
                      : m
                  )
                )
              } else {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `bot-${Date.now()}`,
                    role: 'assistant',
                    text: finalText,
                    timestamp: new Date().toISOString(),
                    resources,
                    data: finalData,
                    messageId: result.messageId || null,
                  },
                ])
              }

              if (result.toast) setToast(result.toast)
            },
            onError: (err) => {
              setMessages((prev) => [
                ...prev,
                {
                  id: `err-${Date.now()}`,
                  role: 'assistant',
                  text: `Error: ${err.message || 'Something went wrong.'}`,
                  timestamp: new Date().toISOString(),
                },
              ])
            },
          }
        )
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: `Error: ${err.message || 'Something went wrong. Please try again.'}`,
            timestamp: new Date().toISOString(),
          },
        ])
      } finally {
        setLoading(false)
        setPhaseLabel('')
      }
    },
    [activeSessionId, loading, user.userId, replyContext]
  )

  // Reply: capture the selected message as context for the next outgoing turn.
  // The actual send-time wiring lives in handleSend; this just records the ref.
  const handleReply = useCallback((msg) => {
    if (!msg?.messageId) return
    setReplyContext({
      messageId: msg.messageId,
      text:      msg.text || '',
      role:      msg.role || 'assistant',
    })
  }, [])

  // Submit a 1-5 rating for an assistant message. On 5★ the backend also
  // saves it as a few-shot example. We optimistically mark `rated` on the
  // local message so the widget can show "saved" without waiting on a refetch.
  const handleRate = useCallback(async (messageId, rating) => {
    if (!messageId || !user?.userId) return
    try {
      const result = await rateMessage({ userId: user.userId, messageId, rating })
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === messageId
            ? { ...m, rated: rating, savedAsExample: !!result.saved_as_example }
            : m
        )
      )
      if (result.message) setToast({ type: 'success', message: result.message })
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not save rating.' })
    }
  }, [user?.userId])

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
        {/* Chat Header — slim, Craze-style. Status / preferences moved into
            a kebab menu so the bar reads as a single hierarchy line.
            Workflow chip + policy-status chip stay inline because they're
            action-relevant (admin clicks workflow → settings; policy chip
            tells user whether RAG is ready). */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/agents')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all active:scale-95"
              title="Back to agents"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[13px] font-medium text-slate-900 dark:text-slate-100 tracking-tight">
              {config.title}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {agentType === 'policy' && (
              <PolicyStatusChip
                status={policyStatus?.status}
                processed={policyStatus?.processed ?? 0}
                total={policyStatus?.total ?? 0}
                count={policyStatus?.policies_count}
              />
            )}
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
            <details className="relative group">
              <summary className="list-none p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer marker:hidden [&::-webkit-details-marker]:hidden">
                <MoreHorizontal className="w-4 h-4" />
              </summary>
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden text-[12px]">
                <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="relative flex w-1.5 h-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-online-pulse" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">Online</span>
                </div>
                <button
                  onClick={toggleDark}
                  className="w-full px-3 py-2 flex items-center gap-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                </button>
              </div>
            </details>
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
                  onRate={handleRate}
                  onReply={handleReply}
                />
              ))}
              {loading && <TypingIndicator label={phaseLabel} />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={loading}
          replyContext={replyContext}
          onCancelReply={() => setReplyContext(null)}
          placeholder={config.placeholder}
          hint={config.inputHint}
          onError={setToast}
        />
      </div>
    </div>
  )
}
