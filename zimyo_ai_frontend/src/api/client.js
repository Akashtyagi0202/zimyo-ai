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
  return res.json()
}

// ---- Auth ----
export async function login({ userId, role, userToken, loadPolicies = true }) {
  const params = new URLSearchParams({ userId, role, userToken, loadPolicies })
  return request(`/login?${params}`, { method: 'POST' })
}

export async function getPolicyStatus(userId) {
  return request(`/policy-status/${userId}`)
}

// ---- Chat ----
export async function sendMessage({ userId, message, sessionId, context }) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ userId, message, sessionId, context }),
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
