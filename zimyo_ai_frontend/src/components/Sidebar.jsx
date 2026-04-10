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
      <div className="w-16 sidebar-transition glass-dark flex flex-col items-center py-4 gap-3 border-r border-white/10">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 bg-gradient-to-br from-zimyo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-zimyo-600/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1" />
        <button
          onClick={handleNew}
          className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all hover:scale-105"
          title="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-72 sidebar-transition bg-zimyo-900 flex flex-col border-r border-white/5">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-zimyo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-zimyo-600/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Zimyo AI</h2>
            <p className="text-white/40 text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              HR Assistant
            </p>
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={handleNew}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-zimyo-600 to-indigo-600 hover:from-zimyo-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 shadow-md shadow-zimyo-700/30 hover:shadow-lg hover:shadow-zimyo-600/30 active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 py-1">
        <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">Recent Chats</p>
        {sessions.map((session, index) => {
          const id = session.sessionId || session.session_id || ''
          const name = session.sessionName || session.session_name || `Chat ${id.slice(0, 6) || '...'}`
          return (
            <button
              key={id || Math.random()}
              onClick={() => id && onSelectSession(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all group ${
                activeSessionId === id
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 transition-colors ${activeSessionId === id ? 'text-zimyo-400' : ''}`} />
              <span className="truncate flex-1">{name}</span>
            </button>
          )
        })}

        {sessions.length === 0 && (
          <div className="text-center mt-8 px-4">
            <MessageSquare className="w-8 h-8 text-white/15 mx-auto mb-2" />
            <p className="text-white/30 text-xs">
              No conversations yet. Start a new chat!
            </p>
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-zimyo-600 to-zimyo-700 rounded-lg flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
            {(user?.userId || 'U').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-sm font-medium truncate">{user?.userId}</p>
            <p className="text-white/40 text-xs capitalize">{user?.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
