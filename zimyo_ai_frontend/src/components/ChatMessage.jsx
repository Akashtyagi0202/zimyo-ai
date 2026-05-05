import { useState, useRef, useEffect } from 'react'
import { Bot, User, FileText, Copy, Check, Volume2, VolumeX, Star, Reply } from 'lucide-react'
import ActionButtons from './ActionButtons'
import MessageRenderer from './MessageRenderer'
import TracePanel from './messages/TracePanel'

export default function ChatMessage({ message, isLast, onActionSelect, onRate, onReply }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speakingRef = useRef(false)

  const ttsSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  useEffect(() => {
    speakingRef.current = isSpeaking
  }, [isSpeaking])

  useEffect(() => {
    return () => {
      if (speakingRef.current) {
        try { window.speechSynthesis.cancel() } catch (_) { /* ignore */ }
      }
    }
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSpeak = () => {
    if (!ttsSupported) return
    if (isSpeaking) {
      try { window.speechSynthesis.cancel() } catch (_) { /* ignore */ }
      setIsSpeaking(false)
      return
    }
    const clean = (message.text || '').replace(/[*_`#~>]/g, '').trim()
    if (!clean) return
    try { window.speechSynthesis.cancel() } catch (_) { /* ignore */ }
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = 'hi-IN'
    u.rate = 0.9
    u.onend = () => setIsSpeaking(false)
    u.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(u)
    setIsSpeaking(true)
  }

  return (
    <div className={`flex gap-2.5 items-start animate-slide-up group ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-indigo-600 shadow-sm shadow-indigo-600/20'
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={`flex-1 min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`relative ${message.data && !isUser ? 'w-full' : 'max-w-[75%]'}`}>
          <div
            className={`msg-bubble leading-relaxed rounded-lg ${
              isUser
                ? 'px-3 py-2 text-[13px] font-light bg-indigo-600 text-white rounded-tr-none shadow-sm shadow-indigo-600/15'
                : 'px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none'
            }`}
          >
            <FormattedText text={message.text} isUser={isUser} />
          </div>

          {/* Action icons on hover (bot messages only) */}
          {!isUser && message.text && (
            <div className="absolute -right-8 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Copy message"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              {onReply && message.messageId && !message.streaming && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                  title="Reply with this as context"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              )}
              {ttsSupported && (
                <button
                  onClick={handleSpeak}
                  className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    isSpeaking ? 'text-zimyo-600 dark:text-zimyo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
                  title={isSpeaking ? 'Stop speaking' : 'Speak message'}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Structured data — MessageRenderer handles table, chart, form, card, etc. */}
        {!isUser && message.data && (
          <MessageRenderer
            msg={message.data}
            onAction={(a) => {
              if (a.values) {
                // Form submit — structured JSON with action + field values
                onActionSelect?.(JSON.stringify({ action: a.action, ...a.values }))
              } else if (a.action) {
                // Button action (e.g. submit_leave, cancel) — JSON so backend can
                // distinguish from natural language chat input
                onActionSelect?.(JSON.stringify({ action: a.action }))
              } else if (a.value !== undefined && a.value !== null) {
                // Chip / simple text selection
                onActionSelect?.(String(a.value))
              }
            }}
          />
        )}

        {/* Action buttons - only on last bot message, skip if structured UI already has actions */}
        {!isUser && isLast && !message.data && onActionSelect && (
          <ActionButtons text={message.text} onSelect={onActionSelect} />
        )}

        {/* Per-node trace panel — only present when backend has TRACE=true. */}
        {!isUser && message.traces && message.traces.length > 0 && (
          <TracePanel traces={message.traces} />
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

        {/* 5-star rating — assistant messages with a server-issued message_id only.
            Streaming bubbles get the id on `final`, so this is hidden until then. */}
        {!isUser && message.messageId && !message.streaming && onRate && (
          <RatingBar
            rated={message.rated || 0}
            savedAsExample={!!message.savedAsExample}
            onRate={(stars) => onRate(message.messageId, stars)}
          />
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 ${isUser ? 'text-right' : 'text-left'} opacity-0 group-hover:opacity-100 transition-opacity`}>
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
            <p key={i} className={`font-semibold ${isUser ? '' : 'text-green-700 dark:text-green-400'}`}>
              {line}
            </p>
          )
        }

        if (line.startsWith('\u274C')) {
          return (
            <p key={i} className={`font-semibold ${isUser ? '' : 'text-red-600 dark:text-red-400'}`}>
              {line}
            </p>
          )
        }

        if (/^[\u{1F4CB}\u{1F4C5}\u{1F4DD}\u{1F4CA}\u{2022}\u{1F4CE}\u{2B50}\u{1F550}\u{23F0}\u{23F1}]/u.test(line)) {
          return (
            <p key={i} className={isUser ? '' : 'text-gray-700 dark:text-gray-200'}>
              {line}
            </p>
          )
        }

        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <p key={i} className={`pl-2 ${isUser ? '' : 'text-gray-600 dark:text-gray-300'}`}>
              {line}
            </p>
          )
        }

        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

/**
 * 5-star rating bar shown under each assistant message. Hover-preview before
 * click; once submitted the bar locks to the chosen rating. Server promotes
 * 5★ ratings to the few-shot example corpus — when that succeeds we surface
 * a "Saved as example" affordance so the admin sees their approval landed.
 */
function RatingBar({ rated, savedAsExample, onRate }) {
  const [hover, setHover] = useState(0)
  const display = hover || rated
  const locked = rated > 0
  return (
    <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= display
          return (
            <button
              key={n}
              type="button"
              disabled={locked}
              onMouseEnter={() => !locked && setHover(n)}
              onClick={() => !locked && onRate(n)}
              className={`p-0.5 rounded transition-colors ${
                locked ? 'cursor-default' : 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/10'
              }`}
              title={locked ? `Rated ${rated}/5` : `Rate ${n}/5`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            </button>
          )
        })}
      </div>
      {locked && savedAsExample && (
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          Saved as example
        </span>
      )}
      {locked && !savedAsExample && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          Thanks
        </span>
      )}
    </div>
  )
}

export function TypingIndicator({ label }) {
  return (
    <div className="flex gap-2.5 items-start animate-slide-up">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-lg rounded-tl-none px-4 py-3">
        <div className="flex gap-2 items-center">
          <div className="flex gap-1.5 items-center">
            <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-indigo-500 rounded-full typing-dot" />
            <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-indigo-500 rounded-full typing-dot" />
            <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-indigo-500 rounded-full typing-dot" />
          </div>
          {label && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 transition-opacity">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
