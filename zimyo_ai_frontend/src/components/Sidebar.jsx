import { Plus, MessageSquare, LogOut, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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
  if (collapsed) {
    return (
      <div className="w-14 sidebar-transition bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-3 gap-1 border-r border-slate-100 dark:border-white/10">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8 text-slate-500 dark:text-white/60">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={onNewSession} title="New chat" className="h-8 w-8 text-slate-500 dark:text-white/60">
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          title="Logout"
          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-64 sidebar-transition bg-slate-50 dark:bg-slate-900 flex flex-col border-r border-slate-100 dark:border-white/5">
      {/* Brand line — tiny logo dot + product name; collapse toggle on the right. */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-slate-700 dark:text-white/80 font-semibold text-[13px] tracking-tight">
            Zimyo AI
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-7 w-7 text-slate-500 dark:text-white/40"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* New chat — primary CTA on a subtle paper surface so it pops without
          fighting the rest of the sidebar's quiet palette. */}
      <div className="px-3 pb-2">
        <Button
          variant="outline"
          onClick={onNewSession}
          className="w-full h-9 justify-start gap-2 bg-white dark:bg-slate-800/60 text-[13px] font-medium rounded-xl border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </Button>
      </div>

      <Separator className="bg-slate-100 dark:bg-white/5 my-1" />

      {/* Session list */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-1">
          <p className="text-slate-400 dark:text-white/30 text-[11px] px-1.5 mb-1.5 mt-1 font-medium uppercase tracking-wider">
            Chats
          </p>
          <div className="space-y-0.5">
          {sessions.map((session, index) => {
            const id = session.sessionId || session.session_id || ''
            const name = session.sessionName || session.session_name || `Chat ${id.slice(0, 6) || '...'}`
            const isActive = activeSessionId === id
            return (
              <button
                key={id || `idx-${index}-${name}`}
                onClick={() => id && onSelectSession(id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[12.5px] transition-all border',
                  isActive
                    ? 'bg-white text-slate-900 border-slate-200 shadow-sm dark:bg-white/15 dark:text-white dark:border-transparent font-medium'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-200 border-transparent dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/80 font-normal'
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <MessageSquare
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-colors',
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-white/40'
                  )}
                />
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
        </div>
      </ScrollArea>

      {/* User footer */}
      <div className="p-3 border-t border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5 px-1 py-1 rounded-lg">
          <Avatar className="h-7 w-7 rounded-lg bg-indigo-500">
            <AvatarFallback className="rounded-lg bg-indigo-500 text-white text-[11px] font-semibold uppercase">
              {(user?.userId || 'U').charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-slate-700 dark:text-white/80 text-[12.5px] font-medium truncate">{user?.userId}</p>
            <p className="text-slate-500 dark:text-white/40 text-[10.5px] capitalize font-normal">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="h-7 w-7 text-slate-400 dark:text-white/40 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
