import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Mic, MicOff } from 'lucide-react'

export default function ChatInput({ onSend, disabled, placeholder, hint, onError }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const textareaRef = useRef(null)
  const recognitionRef = useRef(null)

  const SpeechRecognitionCtor =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  const speechSupported = Boolean(SpeechRecognitionCtor)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [text])

  useEffect(() => {
    if (!speechSupported) return
    const rec = new SpeechRecognitionCtor()
    rec.lang = 'hi-IN'
    rec.continuous = false
    rec.interimResults = true

    rec.onresult = (e) => {
      let interim = ''
      let finalChunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalChunk += r[0].transcript
        else interim += r[0].transcript
      }
      if (finalChunk) {
        setText((prev) => (prev ? prev + ' ' : '') + finalChunk.trim())
        setInterimText('')
      } else {
        setInterimText(interim)
      }
    }

    rec.onerror = (e) => {
      setIsListening(false)
      setInterimText('')
      if (e.error === 'not-allowed' || e.error === 'permission-denied' || e.error === 'service-not-allowed') {
        onError?.({ type: 'error', message: 'Microphone access do browser settings mein' })
      } else if (e.error === 'no-speech') {
        onError?.({ type: 'info', message: 'Kuch bola nahi — dobara try karo' })
      } else if (e.error && e.error !== 'aborted') {
        onError?.({ type: 'error', message: `Voice error: ${e.error}` })
      }
    }

    rec.onend = () => {
      setIsListening(false)
      setInterimText('')
    }

    recognitionRef.current = rec
    return () => {
      try { rec.abort() } catch (_) { /* ignore */ }
    }
  }, [speechSupported])

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

  const toggleMic = () => {
    if (!speechSupported) {
      onError?.({ type: 'warning', message: 'Voice input is not supported in this browser' })
      return
    }
    const rec = recognitionRef.current
    if (!rec) return
    if (isListening) {
      try { rec.stop() } catch (_) { /* ignore */ }
    } else {
      try {
        rec.start()
        setIsListening(true)
      } catch (_) {
        // InvalidStateError: already started — flip state back just in case
        setIsListening(false)
      }
    }
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
    <div className="border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2 glow-ring focus-within:border-zimyo-400 transition-all">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type your message...'}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm py-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-800 dark:text-gray-100 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled || !speechSupported}
            title={
              !speechSupported
                ? 'Voice not supported in this browser'
                : isListening
                ? 'Stop recording'
                : 'Start voice input (Hindi + English)'
            }
            className={`p-2.5 rounded-xl transition-all shrink-0 ${
              !speechSupported || disabled
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : isListening
                ? 'bg-red-500 text-white shadow-md shadow-red-500/30 animate-pulse'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
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
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            } ${sending ? 'animate-send-pop' : ''}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {showInterimBar && (
          <div className="mt-1.5 px-2 text-xs italic text-gray-400 dark:text-gray-500">
            {interimText ? `🎤 ${interimText}` : '🎤 Listening…'}
          </div>
        )}

        {hint && !showInterimBar && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Sparkles className="w-3 h-3 text-gray-300 dark:text-gray-600" />
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
