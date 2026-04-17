import { useState } from 'react'
import { Plus, MessageSquare, LogOut, Bot, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

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
      <div className="w-16 sidebar-transition bg-[#e7ecf3] dark:bg-slate-900 flex flex-col items-center py-4 gap-3 border-r border-slate-300/70 dark:border-white/10">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1" />
        <button
          onClick={handleNew}
          className="p-2 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white transition-all hover:scale-105"
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
    <div className="w-72 sidebar-transition bg-[#e7ecf3] dark:bg-slate-900 flex flex-col border-r border-slate-300/70 dark:border-white/5">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-300/60 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-500/25">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-slate-900 dark:text-white font-medium text-sm tracking-tight">Zimyo AI</h2>
            <p className="text-slate-500 dark:text-white/40 text-[11px] flex items-center gap-1 font-normal">
              <Sparkles className="w-3 h-3" />
              HR Assistant
            </p>
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white/70 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={handleNew}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-indigo-600 hover:bg-white dark:hover:bg-indigo-700 text-indigo-600 dark:text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 border border-slate-200 dark:border-transparent shadow-sm hover:shadow hover:border-indigo-300 active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 py-1">
        <p className="text-slate-500 dark:text-white/30 text-[10px] font-medium uppercase tracking-wider px-3 mb-2">Recent Chats</p>
        {sessions.map((session, index) => {
          const id = session.sessionId || session.session_id || ''
          const name = session.sessionName || session.session_name || `Chat ${id.slice(0, 6) || '...'}`
          const isActive = activeSessionId === id
          return (
            <button
              key={id || Math.random()}
              onClick={() => id && onSelectSession(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] transition-all group ${
                isActive
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-white/15 dark:text-white dark:border-transparent font-medium'
                  : 'text-slate-700 dark:text-white/60 hover:bg-white/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white/80 font-normal border border-transparent'
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-indigo-600 dark:text-zimyo-400' : 'text-slate-500 dark:text-white/40'}`} />
              <span className="truncate flex-1">{name}</span>
            </button>
          )
        })}

        {sessions.length === 0 && (
          <div className="text-center mt-8 px-4">
            <MessageSquare className="w-8 h-8 text-slate-400 dark:text-white/15 mx-auto mb-2" />
            <p className="text-slate-500 dark:text-white/30 text-xs font-normal">
              No conversations yet. Start a new chat!
            </p>
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-300/60 dark:border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/70 dark:hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-xs font-medium uppercase shadow-sm">
            {(user?.userId || 'U').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 dark:text-white/80 text-[13px] font-medium truncate">{user?.userId}</p>
            <p className="text-slate-500 dark:text-white/40 text-[11px] capitalize font-normal">{user?.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/20 text-slate-500 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
