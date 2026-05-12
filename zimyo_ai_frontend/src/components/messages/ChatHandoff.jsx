/**
 * ChatHandoff — renders ui.type === "chat_handoff"
 *
 * Spec: title, message, handoff{ department, estimatedWait, queuePosition?, agent?, context? }, actions[]
 */

import { Headphones, Clock, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ChatHandoff({ msg, onAction }) {
  const { title, message, handoff = {}, actions = [] } = msg

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-sm mt-2 animate-fade-in-scale shadow-sm">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-4 text-center">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
          <Headphones className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/80 mt-1">{message}</p>
      </div>

      {handoff.agent && (
        <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
          <Avatar className="h-9 w-9 rounded-full bg-indigo-600 shrink-0">
            <AvatarFallback className="rounded-full bg-indigo-600 text-white text-xs font-semibold">
              {handoff.agent.avatar || (handoff.agent.name || '?')[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{handoff.agent.name}</p>
            {handoff.agent.role && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{handoff.agent.role}</p>
            )}
          </div>
          {handoff.agent.availability && (
            <span
              className={cn(
                'ml-auto px-2 py-0.5 rounded-full text-[9.5px] font-medium shrink-0',
                handoff.agent.availability === 'online'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : handoff.agent.availability === 'busy'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300'
              )}
            >
              {handoff.agent.availability}
            </span>
          )}
        </div>
      )}

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Estimated wait
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-100">{handoff.estimatedWait}</span>
        </div>
        {handoff.queuePosition && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3 h-3" />
              Queue position
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-100 tabular-nums">#{handoff.queuePosition}</span>
          </div>
        )}
        {handoff.department && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Department</span>
            <span className="font-medium text-slate-800 dark:text-slate-100">{handoff.department}</span>
          </div>
        )}
        {handoff.context && (
          <div className="mt-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Context</p>
            <p className="text-xs text-slate-700 dark:text-slate-200">{handoff.context}</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center justify-center gap-1.5 py-2">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full typing-dot" />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full typing-dot" />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full typing-dot" />
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 ml-1">Connecting…</span>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
          {actions.map((a) => (
            <Button key={a.id} variant="outline" size="sm" onClick={() => onAction?.({ action: a.id })} className="h-8 text-xs">
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
