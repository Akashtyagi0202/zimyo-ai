const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `Request failed: ${res.status}`)
  }
  const json = await res.json()
  // Backend signals an expired Zimyo token via a 200 + envelope so every
  // MCP-backed endpoint can carry the same shape without per-route changes.
  if (json && json.status === 'session_expired') {
    const err = new Error(json.message || 'Session expired. Please log in again.')
    err.code = 'session_expired'
    throw err
  }
  return json
}

// ---- Auth ----
export async function login({ userId, role, userToken, loadPolicies = true }) {
  const params = new URLSearchParams({ userId, role, userToken, loadPolicies })
  return request(`/login?${params}`, { method: 'POST' })
}

export async function getPolicyStatus(userId) {
  return request(`/policy-status/${encodeURIComponent(userId)}`)
}

// ---- Chat ----
/**
 * SSE-streamed chat. Emits:
 *   onPhase({ node, label? })        — per orchestration/LangGraph-node tick
 *   onUiPartial(UiPayload)           — skeleton / partial UI ahead of final
 *   onToken({ t })                   — per-chunk LLM output (opt-in nodes only)
 *   onTrace({ node, output, duration_ms? })
 *                                    — per-node debug payload, ONLY emitted
 *                                       when the backend has TRACE=true. Frontend
 *                                       attaches them to the assistant bubble.
 *   onFinal(ChatResponseDict)        — once; resolves the promise after it runs
 *   onError({ message })             — terminal error event from server
 * Throws on network / non-2xx.
 */
export async function sendMessageStream(
  { userId, message, sessionId, context, replyToMessageId },
  { onPhase, onUiPartial, onToken, onTrace, onFinal, onError, signal } = {}
) {
  const res = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message, sessionId, context, replyToMessageId }),
    signal,
  })
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Stream failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let boundary
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      let event = 'message'
      const dataLines = []
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
      }
      if (dataLines.length === 0) continue

      let parsed
      try { parsed = JSON.parse(dataLines.join('\n')) } catch { continue }

      if (event === 'phase') onPhase?.(parsed)
      else if (event === 'ui_partial') onUiPartial?.(parsed)
      else if (event === 'token') onToken?.(parsed)
      else if (event === 'trace') onTrace?.(parsed)
      else if (event === 'final') { onFinal?.(parsed); return }
      else if (event === 'error') { onError?.(parsed); return }
    }
  }
}

// ---- Feedback ----
/**
 * Submit a 1-5 star rating against an assistant message. Rating == 5 also
 * promotes the (user → assistant) pair into the few-shot example corpus
 * server-side. Returns { saved_as_example, rating, message }.
 */
export async function rateMessage({ userId, messageId, rating }) {
  return request('/feedback/rate', {
    method: 'POST',
    body: JSON.stringify({ userId, messageId, rating }),
  })
}

// ---- Sessions ----
export async function createSession({ userId, sessionName }) {
  return request('/sessions/create', {
    method: 'POST',
    body: JSON.stringify({ userId, sessionName }),
  })
}

export async function getSessions(userId) {
  return request(`/sessions/${userId}`)
}

export async function getSessionHistory(userId, sessionId) {
  return request(`/sessions/${userId}/${sessionId}/history`)
}

// ---- Health ----
export async function checkRedisHealth() {
  return request('/api/health/redis')
}

// ---- Config: CTC defaults ----
export async function getCtcDefaults(userId) {
  return request(`/config/ctc-defaults?userId=${encodeURIComponent(userId)}`)
}

export async function saveCtcDefaults(userId, values) {
  return request('/config/ctc-defaults', {
    method: 'PUT',
    body: JSON.stringify({ userId, ...values }),
  })
}

export async function getCtcDefaultsOptions(userId) {
  return request(`/config/ctc-defaults/options?userId=${encodeURIComponent(userId)}`)
}

// ---- Config: Offer-letter defaults ----
export async function getOfferLetterDefaults(userId) {
  return request(`/config/offer-letter-defaults?userId=${encodeURIComponent(userId)}`)
}

export async function saveOfferLetterDefaults(userId, values) {
  return request('/config/offer-letter-defaults', {
    method: 'PUT',
    body: JSON.stringify({ userId, ...values }),
  })
}

export async function getOfferLetterDefaultsOptions(userId) {
  return request(`/config/offer-letter-defaults/options?userId=${encodeURIComponent(userId)}`)
}

// ---- Config: Active onboarding workflow ----
export async function getWorkflow(userId) {
  return request(`/config/workflow?userId=${encodeURIComponent(userId)}`)
}

export async function saveWorkflow(userId, { id, name }) {
  return request('/config/workflow', {
    method: 'PUT',
    body: JSON.stringify({ userId, id: String(id || ''), name: name || '' }),
  })
}

export async function getWorkflowOptions(userId) {
  return request(`/config/workflow/options?userId=${encodeURIComponent(userId)}`)
}
