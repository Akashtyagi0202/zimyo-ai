/**
 * Empty — renders ui.type === "empty"
 *
 * Spec fields: icon?, title, description?, actions[]
 */

import { Inbox, Calendar, FileText, Search, Users } from 'lucide-react'

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
    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center w-full max-w-sm mt-2 animate-fade-in-scale">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      {actions.length > 0 && (
        <div className="flex gap-2 justify-center mt-4">
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => onAction?.({ action: a.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${
                a.style === 'primary' ? 'bg-zimyo-600 hover:bg-zimyo-700 text-white' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
