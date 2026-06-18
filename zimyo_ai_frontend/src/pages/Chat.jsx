import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sendMessageStream, createSession, getSessions, getSessionHistory, getWorkflow, getPolicyStatus, rateMessage } from '../api/client'
import { AGENT_BY_ID, DEFAULT_AGENT_ID } from '../config/agents'
import Sidebar from '../components/Sidebar'
import ChatSessionRail from '../components/ChatSessionRail'
import ChatMessage, { TypingIndicator } from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import QuickActions from '../components/QuickActions'
import Toast from '../components/Toast'
import WorkflowList from '../components/WorkflowList'
import { ArrowLeft, FileSearch, Sun, Moon, GitBranch, MoreHorizontal } from 'lucide-react'
import useDarkMode from '../hooks/useDarkMode'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

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

// Strip the `{"action":"submit_leave"}` wrapping that button clicks send so
// the user sees a friendly label in the bubble. Only run on user-typed/clicked
// payloads — assistant text never starts with `{` in practice and parsing it
// would just waste cycles.
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

export default function Chat({ user, onLogout }) {
  const { agentType } = useParams()
  const navigate = useNavigate()
  const agent = AGENT_BY_ID[agentType] || AGENT_BY_ID[DEFAULT_AGENT_ID]
  const config = { ...agent, ...agent.chat }
  const { isDark, toggle: toggleDark } = useDarkMode()

  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [phaseLabel, setPhaseLabel] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // Conversation rail state.
  const [railCollapsed, setRailCollapsed] = useState(false)
  // Bump to force the rail to re-fetch its list (after createSession lands).
  const [sessionListVersion, setSessionListVersion] = useState(0)
  // Onboarding-agent only: 'assistant' shows the chat, 'workflow' swaps it for
  // the workflow panel (stub for now; list rendering will land later).
  const [onboardingView, setOnboardingView] = useState('assistant')
  const [toast, setToast] = useState(null)
  const [activeWorkflow, setActiveWorkflow] = useState(null)
  const [policyStatus, setPolicyStatus] = useState(null)
  // input_mode flows both ways: ChatInput tags outgoing sends with their
  // source ('voice' | 'text'); the backend echoes / overrides via the final
  // payload so a voice-initiated turn keeps rendering voice-shaped acks
  // (TTS playback + auto re-arm of the mic) on the next round-trip.
  const [inputMode, setInputMode] = useState('text')
  // replyContext: when set, the next outgoing message references this earlier
  // message so the backend can prepend its text into the router/agent prompt.
  // Cleared automatically after a successful send.
  const [replyContext, setReplyContext] = useState(null)   // { messageId, text, role }
  const messagesEndRef = useRef(null)
  // Tracks the in-flight stream so a navigate-away or rapid second send
  // can abort the first cleanly (no setState on an unmounted component,
  // no orphaned reader leaking the SSE socket).
  const sendAbortRef = useRef(null)
  // Mirror of `loading` for the polling interval's stale-closure-free read —
  // we must NOT merge polled history mid-stream (the live SSE owns messages).
  const loadingRef = useRef(false)
  useEffect(() => { loadingRef.current = loading }, [loading])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // On unmount (e.g. user clicks "Back to agents" mid-stream), abort the
  // in-flight SSE so we don't leak the reader and don't setState on an
  // unmounted component.
  useEffect(() => () => sendAbortRef.current?.abort(), [])

  useEffect(() => {
    if (!user?.userId) return
    loadSessions()
    // user/agent change → reload session list. loadSessions itself is
    // idempotent (creates a session if none exist), so dropping the
    // ref-guard is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, agentType])

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
    // Deliberately NOT keyed on messages.length — refetching on every chat
    // turn was firing /config/workflow per-message. Refresh happens
    // explicitly when an action lands (see onFinal `result.workflow_changed`).
  }, [agentType, user?.userId])

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

  // On mount / user-change: pick up the most recent session and load its
  // history so the chat reads like a continuation. If no sessions exist
  // yet we leave activeSessionId null — the first send will mint one.
  const loadSessions = async () => {
    try {
      const result = await getSessions(user.userId)
      const sessionList = Array.isArray(result?.sessions)
        ? result.sessions
        : (Array.isArray(result) ? result : [])
      if (sessionList.length === 0) {
        setActiveSessionId(null)
        setMessages([])
        return
      }
      sessionList.sort((a, b) => {
        const ta = new Date(a.last_active || a.created_at || 0).getTime()
        const tb = new Date(b.last_active || b.created_at || 0).getTime()
        return tb - ta
      })
      const mostRecent = sessionList[0]
      const recentId = mostRecent.session_id || mostRecent.sessionId
      if (recentId) {
        await loadSessionHistory(recentId)
      }
    } catch {
      // Swallow — empty chat is a fine fallback. User can still type and
      // we'll mint a session on first send.
      setActiveSessionId(null)
      setMessages([])
    }
  }

  // Resume an existing conversation. Maps the persisted Mongo shape
  // (role/message/timestamp/data) into the in-memory message shape Chat
  // renders, so structured cards (form/wizard/confirmation) re-render
  // exactly as they did the first time.
  const loadSessionHistory = useCallback(async (sessionId) => {
    if (!user?.userId || !sessionId) return
    try {
      const res = await getSessionHistory(user.userId, sessionId)
      const rows = Array.isArray(res?.history) ? res.history : []
      const mapped = rows.map(r => ({
        id: r.message_id || `${r.role}-${r.timestamp}`,
        role: r.role,
        text: getDisplayText(r.message ?? ''),
        data: r.data || null,
        timestamp: r.timestamp,
        // Server-side annotation: 'active' | 'resolved' | undefined.
        // ChatMessage locks the structured card when resolved so admins
        // can't replay an approval that was already actioned elsewhere
        // (Approvals page, Mission Control drawer, etc.).
        interruptStatus: r.interrupt_status,
      }))
      setActiveSessionId(sessionId)
      setMessages(mapped)
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not load conversation.' })
    }
  }, [user?.userId])

  // Lightweight poll: refresh out-of-band changes to existing messages —
  // specifically the structured `data` card (e.g. the auto-progress "Chain
  // steps" checklist) which the backend rewrites in place as a workflow
  // advances via webhook / approve resumes, and the interrupt lock state.
  // Merges by message id; never appends/removes (so optimistic + streaming
  // messages aren't disturbed) and returns the prior array unchanged when
  // nothing moved (no needless re-render).
  const refreshSessionData = useCallback(async () => {
    if (!user?.userId || !activeSessionId) return
    try {
      const res = await getSessionHistory(user.userId, activeSessionId)
      const rows = Array.isArray(res?.history) ? res.history : []
      if (!rows.length) return
      const byId = new Map(
        rows.map(r => [r.message_id || `${r.role}-${r.timestamp}`, r]),
      )
      setMessages(prev => {
        let changed = false
        const next = prev.map(m => {
          const r = byId.get(m.id)
          if (!r) return m
          const nextData = r.data || null
          const sameData = JSON.stringify(nextData) === JSON.stringify(m.data || null)
          const sameStatus = (r.interrupt_status ?? null) === (m.interruptStatus ?? null)
          if (sameData && sameStatus) return m
          changed = true
          return { ...m, data: nextData, interruptStatus: r.interrupt_status }
        })
        return changed ? next : prev
      })
    } catch {
      // Best-effort — a transient poll failure is harmless; next tick retries.
    }
  }, [user?.userId, activeSessionId])

  useEffect(() => {
    if (!activeSessionId) return
    const id = setInterval(() => {
      if (!loadingRef.current) refreshSessionData()
    }, 8000)
    return () => clearInterval(id)
  }, [activeSessionId, refreshSessionData])

  const handleSelectSession = useCallback((sessionId) => {
    if (sessionId === activeSessionId) return
    // Abort any in-flight stream from the previous conversation so it
    // can't land on top of the resumed messages and confuse the UI.
    sendAbortRef.current?.abort()
    setLoading(false)
    setPhaseLabel('')
    setReplyContext(null)
    loadSessionHistory(sessionId)
  }, [activeSessionId, loadSessionHistory])

  const handleNewSession = async () => {
    try {
      const result = await createSession({
        userId: user.userId,
        sessionName: `${config.title} - ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      })
      const newSessionId = result.sessionId || result.session_id
      if (newSessionId) {
        setActiveSessionId(newSessionId)
        setMessages([])
        setSessionListVersion(v => v + 1)
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not create a new chat.' })
    }
  }

  const handleSend = useCallback(
    async (text, meta = {}) => {
      if (!text.trim() || loading) return
      const sendMode = meta.source === 'voice' ? 'voice' : 'text'
      setInputMode(sendMode)

      // Abort any in-flight stream before starting a new one. (loading-guard
      // above prevents the common case, but defensive against edge cases
      // where a hung stream hasn't unwound yet.)
      if (sendAbortRef.current) {
        sendAbortRef.current.abort()
      }
      const controller = new AbortController()
      sendAbortRef.current = controller

      let sessionId = activeSessionId
      if (!sessionId) {
        try {
          const result = await createSession({
            userId: user.userId,
            sessionName: text.slice(0, 30),
          })
          sessionId = result.sessionId || result.session_id
          setActiveSessionId(sessionId)
          setSessionListVersion(v => v + 1)
        } catch {
          return
        }
      }

      // crypto.randomUUID() is widely supported in modern browsers; fall
      // back to a Date.now+random combo for older WebView environments.
      const newId = (prefix) =>
        `${prefix}-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)}`

      const userMsg = {
        id: newId('user'),
        role: 'user',
        text: getDisplayText(text),
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)
      setPhaseLabel('Thinking…')

      // Stable id for the streaming bubble; created lazily on first token/ui_partial.
      const streamId = newId('stream')
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

      // ── Typewriter buffer ───────────────────────────────────────────────
      // Backend tokens arrive in coarse chunks (Bedrock can deliver a whole
      // sentence in a single delta), so we accumulate them and reveal the
      // text char-by-char at a steady, self-balancing cadence for a smooth
      // ChatGPT-style typing feel. The per-frame step scales with the backlog
      // so a big chunk still flushes quickly while the tail eases in gently.
      const tw = { full: '', shown: 0, raf: 0, ended: false, final: null }

      const finalizeBubble = () => {
        const f = tw.final
        if (!f) return
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamId
              ? {
                  ...m,
                  text: f.text,
                  data: f.data,
                  resources: f.resources,
                  streaming: false,
                  messageId: f.messageId,
                }
              : m
          )
        )
        if (f.toast) setToast(f.toast)
      }

      const pump = () => {
        tw.raf = 0
        const remaining = tw.full.length - tw.shown
        if (remaining > 0) {
          tw.shown = Math.min(
            tw.full.length,
            tw.shown + Math.max(2, Math.ceil(remaining / 10))
          )
          const slice = tw.full.slice(0, tw.shown)
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, text: slice } : m))
          )
        }
        if (tw.shown < tw.full.length) {
          tw.raf = requestAnimationFrame(pump)
        } else if (tw.ended) {
          // Caught up to the final text → swap in cards/links + drop the caret.
          finalizeBubble()
        }
      }

      const startPump = () => {
        if (!tw.raf) tw.raf = requestAnimationFrame(pump)
      }

      // Stop the animation if this send is aborted (unmount / newer send / Stop).
      controller.signal.addEventListener('abort', () => {
        if (tw.raf) {
          cancelAnimationFrame(tw.raf)
          tw.raf = 0
        }
      })

      // Snapshot + clear reply context up-front so a slow stream doesn't carry
      // it into a subsequent message if user types before this one finishes.
      const replyToMessageId = replyContext?.messageId || null
      setReplyContext(null)

      try {
        await sendMessageStream(
          { userId: user.userId, message: text, sessionId, replyToMessageId, inputMode: sendMode },
          {
            signal: controller.signal,
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
              tw.full += t
              startPump()
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

              // Backend may flip the mode (voice → text when handing off to a
              // form, or vice-versa). Echo of the same value is a no-op.
              if (result.input_mode === 'voice' || result.input_mode === 'text') {
                setInputMode(result.input_mode)
              }

              if (streamingCreated) {
                // Hand the authoritative final text to the typewriter. It
                // finishes revealing whatever hasn't typed yet, then
                // finalizeBubble swaps in the real data/links, drops the caret
                // and fires the toast. (finalText is the source of truth — it
                // may differ slightly from the concatenated token stream.)
                tw.full = finalText
                tw.ended = true
                tw.final = {
                  text: finalText,
                  data: finalData,
                  resources,
                  messageId: result.messageId || null,
                  toast: result.toast,
                }
                if (tw.shown >= tw.full.length) finalizeBubble()
                else startPump()
              } else {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: newId('bot'),
                    role: 'assistant',
                    text: finalText,
                    timestamp: new Date().toISOString(),
                    resources,
                    data: finalData,
                    messageId: result.messageId || null,
                  },
                ])
                if (result.toast) setToast(result.toast)
              }
            },
            onError: (err) => {
              setMessages((prev) => [
                ...prev,
                {
                  id: newId('err'),
                  role: 'assistant',
                  text: `Error: ${err.message || 'Something went wrong.'}`,
                  timestamp: new Date().toISOString(),
                },
              ])
            },
          }
        )
      } catch (err) {
        // Aborts are deliberate — don't surface as a user-visible error.
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          // fall through to finally
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: newId('err'),
              role: 'assistant',
              text: `Error: ${err.message || 'Something went wrong. Please try again.'}`,
              timestamp: new Date().toISOString(),
            },
          ])
        }
      } finally {
        // Only clear if we still own the slot — a newer send may have
        // already overwritten sendAbortRef before we got here.
        if (sendAbortRef.current === controller) {
          sendAbortRef.current = null
        }
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
  const showWorkflowView = agentType === 'onboarding' && onboardingView === 'workflow'

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Toast notifications */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Sidebar */}
      <Sidebar
        onLogout={onLogout}
        user={user}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeAgentId={agentType}
        onboardingView={onboardingView}
        onOnboardingViewChange={setOnboardingView}
      />

      {/* Conversations rail — list of past sessions; click to resume.
          Hidden in the workflow view since that pane has its own header. */}
      {!showWorkflowView ? (
        <ChatSessionRail
          userId={user?.userId}
          activeSessionId={activeSessionId}
          collapsed={railCollapsed}
          onToggleCollapse={() => setRailCollapsed(c => !c)}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewSession}
          refreshKey={sessionListVersion}
        />
      ) : null}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header — slim Craze-style bar. Title left, status chips +
            kebab menu right. Workflow / policy chips stay inline because
            they're action-relevant (click workflow → settings, policy chip
            tells user whether RAG is ready). Online + theme moved into the
            kebab menu so the bar reads as one tight hierarchy line. */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/agents')}
                  className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Back to agents</TooltipContent>
            </Tooltip>
            <h1 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="flex items-center gap-2 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  <span className="relative flex w-1.5 h-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-online-pulse" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Online
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleDark} className="text-[12px]">
                  {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages Area — clean white surface so the chat reads as the
            active panel against the sidebar gutter; matches the slim
            header + minimal empty state. Onboarding-agent's "Workflow"
            sidebar tab swaps this whole pane (and hides the input) for
            the workflow list. */}
        {showWorkflowView ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <WorkflowList
              userId={user?.userId}
              onActiveChange={(wf) => setActiveWorkflow(wf && wf.id ? wf : null)}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950">
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
              inputMode={inputMode}
            />
          </>
        )}
      </div>
    </div>
  )
}
