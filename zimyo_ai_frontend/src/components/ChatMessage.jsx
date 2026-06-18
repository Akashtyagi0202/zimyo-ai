import { useState, useRef, useEffect } from 'react'
import { Bot, User, FileText, Copy, Check, Volume2, VolumeX, Star, Reply, Lock } from 'lucide-react'
import ActionButtons from './ActionButtons'
import MessageRenderer from './MessageRenderer'
import TracePanel from './messages/TracePanel'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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
    // Backend can pin language explicitly via message.lang; otherwise sniff
    // the script — devanagari → hi-IN, roman/anything else → en-IN.
    u.lang = message.lang || (/[ऀ-ॿ]/.test(clean) ? 'hi-IN' : 'en-IN')
    u.rate = 0.9
    u.onend = () => setIsSpeaking(false)
    u.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(u)
    setIsSpeaking(true)
  }

  return (
    <div className={cn('flex gap-2.5 items-start animate-slide-up group', isUser && 'flex-row-reverse')}>
      {/* Avatar — square rounded with shadcn primitive; assistant gets a
          paper-feel border, user gets the brand fill. */}
      <Avatar
        className={cn(
          'h-8 w-8 rounded-xl shrink-0 shadow-sm',
          isUser
            ? 'bg-indigo-600 ring-1 ring-indigo-500/20'
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
        )}
      >
        <AvatarFallback
          className={cn(
            'rounded-xl bg-transparent',
            isUser ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'
          )}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex-1 min-w-0 flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div className={cn('relative', message.data && !isUser ? 'w-full' : 'max-w-[75%]')}>
          <div
            className={cn(
              'msg-bubble leading-relaxed rounded-2xl',
              isUser
                ? 'px-3.5 py-2 text-[13px] font-light bg-indigo-600 text-white shadow-sm shadow-indigo-600/15'
                : 'px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
            )}
          >
            <FormattedText text={message.text} isUser={isUser} />
          </div>

          {/* Hover actions — bot only. shadcn Button + Tooltip; the floating
              column sits just outside the bubble so it doesn't reflow text. */}
          {!isUser && message.text && (
            <div className="absolute -right-9 top-1.5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-6 w-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{copied ? 'Copied' : 'Copy'}</TooltipContent>
              </Tooltip>

              {onReply && message.messageId && !message.streaming && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onReply(message)}
                      className="h-6 w-6 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Reply with context</TooltipContent>
                </Tooltip>
              )}

              {ttsSupported && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSpeak}
                      className={cn(
                        'h-6 w-6',
                        isSpeaking
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      )}
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">{isSpeaking ? 'Stop' : 'Speak'}</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        {/* Structured data — MessageRenderer handles table, chart, form, card, etc.
            When the backing workflow has resolved (admin approved/cancelled
            from a different surface like the Approvals page), interactive
            cards are locked so the old Submit/Approve buttons can't be
            replayed — the graph won't be paused there anymore. */}
        {!isUser && message.data && (() => {
          const resolved = message.interruptStatus === 'resolved'
          const node = (
            <MessageRenderer
              msg={message.data}
              onAction={(a) => {
                if (resolved) return
                if (a.values) {
                  onActionSelect?.(JSON.stringify({ action: a.action, ...a.values }))
                } else if (a.action) {
                  onActionSelect?.(JSON.stringify({ action: a.action }))
                } else if (a.value !== undefined && a.value !== null) {
                  onActionSelect?.(String(a.value))
                }
              }}
            />
          )
          if (!resolved) return node
          return (
            <div className="relative w-full mt-1">
              <div
                aria-disabled
                className="opacity-60 pointer-events-none select-none"
              >
                {node}
              </div>
              <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px] font-medium text-slate-600 dark:text-slate-300">
                <Lock className="w-3 h-3" />
                Resolved
              </div>
            </div>
          )
        })()}

        {!isUser && isLast && !message.data && onActionSelect && (
          <ActionButtons text={message.text} onSelect={onActionSelect} />
        )}

        {!isUser && message.traces && message.traces.length > 0 && (
          <TracePanel traces={message.traces} />
        )}

        {message.resources && message.resources.length > 0 && (
          <div className="mt-2 space-y-1.5 w-full max-w-md">
            {message.resources.map((res, i) => (
              <div
                key={res.id || res.url || res.name || i}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-default"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{res.name}</span>
              </div>
            ))}
          </div>
        )}

        {!isUser && message.messageId && !message.streaming && onRate && (
          <RatingBar
            rated={message.rated || 0}
            savedAsExample={!!message.savedAsExample}
            onRate={(stars) => onRate(message.messageId, stars)}
          />
        )}

        {message.timestamp && (
          <p
            className={cn(
              'text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity',
              isUser ? 'text-right' : 'text-left'
            )}
          >
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

        if (line.startsWith('✅')) {
          return (
            <p key={i} className={cn('font-semibold', !isUser && 'text-emerald-700 dark:text-emerald-400')}>
              {line}
            </p>
          )
        }

        if (line.startsWith('❌')) {
          return (
            <p key={i} className={cn('font-semibold', !isUser && 'text-rose-600 dark:text-rose-400')}>
              {line}
            </p>
          )
        }

        if (/^[\u{1F4CB}\u{1F4C5}\u{1F4DD}\u{1F4CA}\u{2022}\u{1F4CE}\u{2B50}\u{1F550}\u{23F0}\u{23F1}]/u.test(line)) {
          return (
            <p key={i} className={!isUser ? 'text-slate-700 dark:text-slate-200' : ''}>
              {line}
            </p>
          )
        }

        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <p key={i} className={cn('pl-2', !isUser && 'text-slate-600 dark:text-slate-300')}>
              {line}
            </p>
          )
        }

        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

function RatingBar({ rated, savedAsExample, onRate }) {
  const [hover, setHover] = useState(0)
  const display = hover || rated
  const locked = rated > 0
  return (
    <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= display
          return (
            <button
              key={n}
              type="button"
              disabled={locked}
              onMouseEnter={() => !locked && setHover(n)}
              onClick={() => !locked && onRate(n)}
              className={cn(
                'p-0.5 rounded transition-colors',
                locked ? 'cursor-default' : 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/10'
              )}
              title={locked ? `Rated ${rated}/5` : `Rate ${n}/5`}
            >
              <Star
                className={cn(
                  'w-3.5 h-3.5',
                  filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                )}
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
        <span className="text-[10px] text-slate-400 dark:text-slate-500">Thanks</span>
      )}
    </div>
  )
}

export function TypingIndicator({ label }) {
  return (
    <div className="flex gap-2.5 items-start animate-slide-up">
      <Avatar className="h-8 w-8 rounded-xl shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <AvatarFallback className="rounded-xl bg-transparent text-indigo-600 dark:text-indigo-400">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 shadow-sm">
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
