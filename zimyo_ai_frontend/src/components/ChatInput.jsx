import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'

export default function ChatInput({ onSend, disabled, placeholder, hint }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [text])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    setSending(true)
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setTimeout(() => setSending(false), 200)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasText = text.trim().length > 0

  return (
    <div className="border-t border-gray-100 bg-white/80 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-gray-50/80 border border-gray-200 rounded-2xl px-4 py-2 glow-ring focus-within:border-zimyo-400 transition-all">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type your message...'}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm py-2 placeholder:text-gray-400 text-gray-800 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!hasText || disabled}
            className={`p-2.5 rounded-xl transition-all shrink-0 ${
              hasText && !disabled
                ? 'bg-gradient-to-r from-zimyo-600 to-indigo-600 hover:from-zimyo-700 hover:to-indigo-700 text-white shadow-md shadow-zimyo-600/25 hover:shadow-lg hover:shadow-zimyo-600/30'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            } ${sending ? 'animate-send-pop' : ''}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {hint && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Sparkles className="w-3 h-3 text-gray-300" />
            <p className="text-[10px] text-gray-400">{hint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
