import { useState } from 'react'
import { Bot, User, FileText, Copy, Check } from 'lucide-react'
import ActionButtons from './ActionButtons'
import MessageRenderer from './MessageRenderer'

export default function ChatMessage({ message, isLast, onActionSelect }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`flex gap-3 animate-slide-up group ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
          isUser ? 'bg-zimyo-600' : 'bg-gradient-to-br from-violet-500 to-indigo-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="relative">
          <div
            className={`msg-bubble px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? 'bg-gradient-to-br from-zimyo-600 to-zimyo-700 text-white rounded-tr-md shadow-md shadow-zimyo-600/20'
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md shadow-sm'
            }`}
          >
            <FormattedText text={message.text} isUser={isUser} />
          </div>

          {/* Copy button on hover (bot messages only) */}
          {!isUser && message.text && (
            <button
              onClick={handleCopy}
              className="absolute -right-8 top-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Structured data — MessageRenderer handles table, chart, form, card, etc. */}
        {!isUser && message.data && (
          <MessageRenderer
            msg={message.data}
            onAction={(a) => {
              if (a.values) {
                // Form submit — send as structured JSON message
                onActionSelect?.(JSON.stringify({ action: a.action, ...a.values }))
              } else {
                onActionSelect?.(a.value || a.action)
              }
            }}
          />
        )}

        {/* Action buttons - only on last bot message, skip if structured UI already has actions */}
        {!isUser && isLast && !message.data && onActionSelect && (
          <ActionButtons text={message.text} leaveTypes={message.leaveTypes} onSelect={onActionSelect} />
        )}

        {/* Resource attachments (policy documents) */}
        {message.resources && message.resources.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.resources.map((res, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 hover:bg-blue-100 transition-colors cursor-default"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{res.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <p className={`text-[10px] text-gray-400 mt-1.5 ${isUser ? 'text-right' : 'text-left'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            {new Date(message.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}

function FormattedText({ text, isUser }) {
  if (!text) return null

  const lines = text.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />

        if (line.startsWith('\u2705')) {
          return (
            <p key={i} className={`font-semibold ${isUser ? '' : 'text-green-700'}`}>
              {line}
            </p>
          )
        }

        if (line.startsWith('\u274C')) {
          return (
            <p key={i} className={`font-semibold ${isUser ? '' : 'text-red-600'}`}>
              {line}
            </p>
          )
        }

        if (/^[\u{1F4CB}\u{1F4C5}\u{1F4DD}\u{1F4CA}\u{2022}\u{1F4CE}\u{2B50}\u{1F550}\u{23F0}\u{23F1}]/u.test(line)) {
          return (
            <p key={i} className={isUser ? '' : 'text-gray-700'}>
              {line}
            </p>
          )
        }

        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <p key={i} className={`pl-2 ${isUser ? '' : 'text-gray-600'}`}>
              {line}
            </p>
          )
        }

        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm">
        <div className="flex gap-1.5 items-center">
          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
        </div>
      </div>
    </div>
  )
}
