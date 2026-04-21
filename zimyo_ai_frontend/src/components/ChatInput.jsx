import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Mic, MicOff } from 'lucide-react'
import useDeepgramSTT from '../hooks/useDeepgramSTT'

export default function ChatInput({ onSend, disabled, placeholder, hint, onError }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef(null)

  const handleFinalChunk = useCallback((chunk) => {
    if (!chunk) return
    setText((prev) => (prev ? prev + ' ' : '') + chunk)
  }, [])

  const { isListening, interimText, startListening, stopListening } = useDeepgramSTT({
    onFinal: handleFinalChunk,
    onError,
  })

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [text])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    if (isListening) stopListening()
    setSending(true)
    onSend(trimmed)
    setText('')
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
    <div className="border-t border-slate-200/70 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-500/20 focus-within:bg-white dark:focus-within:bg-slate-800">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type your message...'}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-[13px] py-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled}
            title={isListening ? 'Stop recording' : 'Start voice input (Hinglish)'}
            className={`p-2.5 rounded-xl transition-all shrink-0 ${
              disabled
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                : isListening
                ? 'bg-red-500 text-white shadow-sm shadow-red-500/30 animate-pulse'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-slate-200 border border-slate-200 dark:border-transparent'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSend}
            disabled={!hasText || disabled}
            className={`p-2.5 rounded-xl transition-all shrink-0 ${
              hasText && !disabled
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25 hover:shadow-md hover:shadow-indigo-600/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            } ${sending ? 'animate-send-pop' : ''}`}
          >
            <Send className="w-4 h-4" />
          </button>
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
