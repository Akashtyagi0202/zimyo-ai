import { useCallback, useEffect, useRef, useState } from 'react'

const DEEPGRAM_WS = 'wss://api.deepgram.com/v1/listen'

function buildUrl(params) {
  const qs = new URLSearchParams(params).toString()
  return `${DEEPGRAM_WS}?${qs}`
}

export default function useDeepgramSTT({ onFinal, onError, language = 'multi' } = {}) {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')

  const socketRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const keepAliveRef = useRef(null)

  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY

  const cleanup = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch (_) { /* ignore */ }
    }
    recorderRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'CloseStream' }))
        }
        socketRef.current.close()
      } catch (_) { /* ignore */ }
      socketRef.current = null
    }
    setInterimText('')
  }, [])

  const startListening = useCallback(async () => {
    if (isListening) return
    if (!apiKey) {
      onError?.({ type: 'error', message: 'Deepgram key missing — VITE_DEEPGRAM_API_KEY in .env' })
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        onError?.({ type: 'error', message: 'Microphone access do browser settings mein' })
      } else {
        onError?.({ type: 'error', message: `Mic error: ${err?.message || err}` })
      }
      return
    }
    streamRef.current = stream

    try {
      const url = buildUrl({
        model: 'nova-2',
        language,
        smart_format: 'true',
        interim_results: 'true',
        punctuate: 'true',
        endpointing: '300',
      })
      const socket = new WebSocket(url, ['token', apiKey])
      socketRef.current = socket

      socket.onopen = () => {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
        const recorder = new MediaRecorder(stream, { mimeType })
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(e.data)
          }
        }
        recorder.start(250)
        recorderRef.current = recorder

        keepAliveRef.current = setInterval(() => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            try { socketRef.current.send(JSON.stringify({ type: 'KeepAlive' })) } catch (_) { /* ignore */ }
          }
        }, 7000)

        setIsListening(true)
      }

      socket.onmessage = (event) => {
        let data
        try { data = JSON.parse(event.data) } catch (_) { return }
        if (data.type !== 'Results') return
        const transcript = data?.channel?.alternatives?.[0]?.transcript || ''
        if (!transcript) return
        if (data.is_final) {
          onFinal?.(transcript.trim())
          setInterimText('')
        } else {
          setInterimText(transcript)
        }
      }

      socket.onerror = () => {
        onError?.({ type: 'error', message: 'Voice error: connection failed' })
        cleanup()
        setIsListening(false)
      }

      socket.onclose = (ev) => {
        if (ev.code !== 1000 && ev.code !== 1005) {
          onError?.({ type: 'error', message: `Voice closed (${ev.code})` })
        }
        cleanup()
        setIsListening(false)
      }
    } catch (err) {
      onError?.({ type: 'error', message: `Deepgram init: ${err?.message || err}` })
      cleanup()
      setIsListening(false)
    }
  }, [apiKey, isListening, language, onFinal, onError, cleanup])

  const stopListening = useCallback(() => {
    cleanup()
    setIsListening(false)
  }, [cleanup])

  useEffect(() => () => cleanup(), [cleanup])

  return { isListening, interimText, startListening, stopListening }
}
