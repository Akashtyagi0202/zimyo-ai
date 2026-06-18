import { useCallback, useEffect, useState } from 'react'
import { Plus, MessageSquare, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { getSessions } from '@/api/client'
import { cn } from '@/lib/utils'

// Collapsible left rail listing all chat sessions for the current user.
// Click → resume that conversation (parent calls getSessionHistory and
// loads it into the chat). "+ New chat" creates a fresh session.

function relativeFrom(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

export default function ChatSessionRail({
  userId,
  activeSessionId,
  collapsed,
  onToggleCollapse,
  onSelectSession,
  onNewChat,
  refreshKey, // bump to force re-fetch after a new session lands
}) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true); setError(null)
    try {
      const res = await getSessions(userId)
      const list = Array.isArray(res?.sessions) ? res.sessions : (Array.isArray(res) ? res : [])
      // Newest first by last_active (fallback to created_at).
      list.sort((a, b) => {
        const ta = new Date(a.last_active || a.created_at || 0).getTime()
        const tb = new Date(b.last_active || b.created_at || 0).getTime()
        return tb - ta
      })
      setSessions(list)
    } catch (err) {
      setError(err?.message || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load, refreshKey])

  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-2 gap-1">
        <button
          onClick={onToggleCollapse}
          title="Expand conversations"
          className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
          title="New chat"
          className="w-8 h-8 rounded-md flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </aside>
    )
  }

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
      <header className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Conversations
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={load}
            disabled={loading}
            title="Refresh"
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={onToggleCollapse}
            title="Collapse"
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="px-2 py-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[12.5px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading && sessions.length === 0 ? (
          <div className="flex items-center gap-2 px-2 py-3 text-[11.5px] text-slate-500 dark:text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="px-2 py-3 text-[11.5px] text-rose-600 dark:text-rose-400">
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-2 py-6 text-center text-[11.5px] text-slate-400 dark:text-slate-500">
            No past conversations yet.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map(s => {
              const id = s.session_id || s.sessionId
              const name = s.session_name || s.sessionName || `Session ${String(id).slice(0, 8)}`
              const when = s.last_active || s.created_at
              const isActive = id === activeSessionId
              return (
                <li key={id}>
                  <button
                    onClick={() => onSelectSession?.(id)}
                    className={cn(
                      'w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
                    )}
                  >
                    <MessageSquare className={cn(
                      'w-3.5 h-3.5 mt-0.5 shrink-0',
                      isActive ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500',
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{name}</div>
                      {when ? (
                        <div className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {relativeFrom(when)} ago
                        </div>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
