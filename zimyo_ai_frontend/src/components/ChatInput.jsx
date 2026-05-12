import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Mic, MicOff, Reply, X, Paperclip, AtSign } from 'lucide-react'
import useDeepgramSTT from '../hooks/useDeepgramSTT'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ChatInput({
  onSend, disabled, placeholder, hint, onError,
  replyContext, onCancelReply, inputMode = 'text',
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef(null)
  // Tracks whether the current draft was dictated. Set on every interim/final
  // chunk from STT and cleared after send so a typed turn after a voice turn
  // is correctly tagged 'text'.
  const draftFromVoiceRef = useRef(false)

  const handleFinalChunk = useCallback((chunk) => {
    if (!chunk) return
    draftFromVoiceRef.current = true
    setText((prev) => (prev ? prev + ' ' : '') + chunk)
  }, [])

  const { isListening, interimText, startListening, stopListening } = useDeepgramSTT({
    onFinal: handleFinalChunk,
    onError,
  })

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px'
    }
  }, [text])

  // Voice 2-phase ack: when the last assistant turn was voice-shaped and the
  // composer just unblocked (stream finished), auto re-arm the mic so the
  // user can keep talking without re-tapping. Idempotent: the inner guard
  // skips if a recording is already live.
  const wasDisabled = useRef(disabled)
  useEffect(() => {
    if (wasDisabled.current && !disabled && inputMode === 'voice' && !isListening) {
      startListening()
    }
    wasDisabled.current = disabled
  }, [disabled, inputMode, isListening, startListening])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    const source = isListening || draftFromVoiceRef.current ? 'voice' : 'text'
    if (isListening) stopListening()
    setSending(true)
    onSend(trimmed, { source })
    setText('')
    draftFromVoiceRef.current = false
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setTimeout(() => setSending(false), 200)
  }

  const toggleMic = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasText = text.trim().length > 0
  const showInterimBar = isListening || Boolean(interimText)

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-4">
      <div className="max-w-4xl mx-auto">
        {replyContext && (
          <div className="mb-2 flex items-start gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 border-l-2 border-indigo-400 dark:border-indigo-500 rounded-r-md">
            <Reply className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                Replying to {replyContext.role === 'user' ? 'your message' : 'assistant'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 break-words">
                {(replyContext.text || '').slice(0, 200)}
                {(replyContext.text || '').length > 200 ? '…' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Composer card — Craze-style: textarea on top, actions row at the
            bottom inside the same rounded surface. Focus ring grows the
            shadow so the bar feels active without changing layout. */}
        <div
          className={cn(
            'flex flex-col gap-1 rounded-2xl border bg-white dark:bg-slate-800/60 px-3 pt-3 pb-2 transition-all',
            'border-slate-200 dark:border-slate-700 shadow-sm',
            'focus-within:border-indigo-300 dark:focus-within:border-indigo-500/60',
            'focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-500/20',
            'focus-within:shadow-md'
          )}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Ask Zimyo AI… Use @ for context'}
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent outline-none resize-none text-[13.5px] leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100 disabled:opacity-50 px-1"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                disabled
                title="Attach (coming soon)"
                className="h-7 w-7 text-slate-400 dark:text-slate-500"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled
                title="Mention context (coming soon)"
                className="h-7 w-7 text-slate-400 dark:text-slate-500"
              >
                <AtSign className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMic}
                disabled={disabled}
                title={isListening ? 'Stop recording' : 'Start voice input (Hinglish)'}
                className={cn(
                  'h-8 w-8 rounded-full transition-all',
                  disabled && 'text-slate-300 dark:text-slate-600 cursor-not-allowed',
                  !disabled && isListening && 'bg-red-500 text-white hover:bg-red-600 hover:text-white shadow-sm shadow-red-500/30 animate-pulse',
                  !disabled && !isListening && 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200'
                )}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                onClick={handleSend}
                disabled={!hasText || disabled}
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-full transition-all',
                  hasText && !disabled
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700',
                  sending && 'animate-send-pop'
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {showInterimBar && (
          <div className="mt-1.5 px-2 text-xs italic text-indigo-500 dark:text-indigo-400">
            {interimText ? `🎤 ${interimText}` : '🎤 Listening…'}
          </div>
        )}

        {hint && !showInterimBar && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Sparkles className="w-3 h-3 text-indigo-300 dark:text-indigo-500/50" />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{hint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
