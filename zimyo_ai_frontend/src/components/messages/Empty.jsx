/**
 * Empty — renders ui.type === "empty"
 *
 * Spec fields: icon?, title, description?, actions[]
 */

import { Inbox, Calendar, FileText, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ICONS = {
  inbox: Inbox,
  calendar: Calendar,
  file: FileText,
  search: Search,
  users: Users,
  default: Inbox,
}

export default function Empty({ msg, onAction }) {
  const { title, description, actions = [] } = msg
  const Icon = ICONS[msg.icon] || ICONS.default

  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-7 text-center w-full max-w-sm mt-2 animate-fade-in-scale">
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
      {actions.length > 0 && (
        <div className="flex gap-2 justify-center mt-4">
          {actions.map((a) => (
            <Button
              key={a.id}
              variant={a.style === 'primary' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAction?.({ action: a.id })}
              className={cn(
                'h-8 text-xs',
                a.style === 'primary' &&
                  'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
              )}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
