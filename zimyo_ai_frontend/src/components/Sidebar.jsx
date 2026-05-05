import { useState } from 'react'
import { Plus, MessageSquare, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onLogout,
  user,
  collapsed,
  onToggleCollapse,
}) {
  const [creating, setCreating] = useState(false)

  const handleNew = async () => {
    setCreating(true)
    await onNewSession()
    setCreating(false)
  }

  if (collapsed) {
    return (
      <div className="w-14 sidebar-transition bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-3 gap-2 border-r border-slate-100 dark:border-white/10">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button
          onClick={handleNew}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white transition-all"
          title="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/20 text-slate-400 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-all"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-64 sidebar-transition bg-slate-50 dark:bg-slate-900 flex flex-col border-r border-slate-100 dark:border-white/5">
      {/* Header — quiet brand line; collapse toggle on the right. */}
      <div className="p-3 flex items-center justify-between">
        <h2 className="text-slate-700 dark:text-white/80 font-medium text-[13px] tracking-tight">
          Zimyo AI
        </h2>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-2">
        <button
          onClick={handleNew}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-indigo-600 hover:bg-slate-50 dark:hover:bg-indigo-700 text-slate-700 dark:text-white text-[13px] font-medium rounded-xl transition-all disabled:opacity-50 border border-slate-200 dark:border-transparent active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 py-1">
        <p className="text-slate-400 dark:text-white/30 text-[11px] px-3 mb-1">Chats</p>
        {sessions.map((session, index) => {
          const id = session.sessionId || session.session_id || ''
          const name = session.sessionName || session.session_name || `Chat ${id.slice(0, 6) || '...'}`
          const isActive = activeSessionId === id
          return (
            <button
              key={id || Math.random()}
              onClick={() => id && onSelectSession(id)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-[12.5px] transition-all group ${
                isActive
                  ? 'bg-white text-slate-900 border border-slate-200 dark:bg-white/15 dark:text-white dark:border-transparent font-medium'
                  : 'text-slate-600 dark:text-white/60 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white/80 font-normal border border-transparent'
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-indigo-600 dark:text-zimyo-400' : 'text-slate-400 dark:text-white/40'}`} />
              <span className="truncate flex-1">{name}</span>
            </button>
          )
        })}

        {sessions.length === 0 && (
          <div className="text-center mt-6 px-4">
            <p className="text-slate-400 dark:text-white/30 text-[11px] font-normal">
              No conversations yet.
            </p>
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5 px-1 py-1 rounded-lg">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-[11px] font-medium uppercase">
            {(user?.userId || 'U').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-700 dark:text-white/80 text-[12.5px] font-medium truncate">{user?.userId}</p>
            <p className="text-slate-500 dark:text-white/40 text-[10.5px] capitalize font-normal">{user?.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/20 text-slate-400 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
