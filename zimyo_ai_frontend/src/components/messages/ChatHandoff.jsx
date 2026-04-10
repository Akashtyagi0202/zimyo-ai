/**
 * ChatHandoff — renders ui.type === "chat_handoff"
 *
 * Spec: title, message, handoff{ department, estimatedWait, queuePosition?, agent?, context? }, actions[]
 */

import { Headphones, Clock, User } from 'lucide-react'

export default function ChatHandoff({ msg, onAction }) {
  const { title, message, handoff = {}, actions = [] } = msg

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-sm mt-2 animate-fade-in-scale">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-4 text-center">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
          <Headphones className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/70 mt-1">{message}</p>
      </div>

      {/* Agent info */}
      {handoff.agent && (
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zimyo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {handoff.agent.avatar || (handoff.agent.name || '?')[0]}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-900">{handoff.agent.name}</p>
            {handoff.agent.role && <p className="text-[10px] text-gray-500">{handoff.agent.role}</p>}
          </div>
          {handoff.agent.availability && (
            <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-medium ${
              handoff.agent.availability === 'online' ? 'bg-green-100 text-green-700' :
              handoff.agent.availability === 'busy' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {handoff.agent.availability}
            </span>
          )}
        </div>
      )}

      {/* Wait info */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 flex items-center gap-1.5"><Clock className="w-3 h-3" />Estimated wait</span>
          <span className="font-medium text-gray-800">{handoff.estimatedWait}</span>
        </div>
        {handoff.queuePosition && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 flex items-center gap-1.5"><User className="w-3 h-3" />Queue position</span>
            <span className="font-medium text-gray-800">#{handoff.queuePosition}</span>
          </div>
        )}
        {handoff.department && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Department</span>
            <span className="font-medium text-gray-800">{handoff.department}</span>
          </div>
        )}
        {handoff.context && (
          <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-gray-500">Context</p>
            <p className="text-xs text-gray-700">{handoff.context}</p>
          </div>
        )}
      </div>

      {/* Connecting animation */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-center gap-1.5 py-2">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full typing-dot" />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full typing-dot" />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full typing-dot" />
          <span className="text-[10px] text-indigo-500 ml-1">Connecting...</span>
        </div>
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 border-t border-gray-100 pt-2">
          {actions.map(a => (
            <button key={a.id} onClick={() => onAction?.({ action: a.id })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all active:scale-95">
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
