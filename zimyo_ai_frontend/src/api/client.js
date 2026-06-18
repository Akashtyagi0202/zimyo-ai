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
  { userId, message, sessionId, context, replyToMessageId, inputMode },
  { onPhase, onUiPartial, onToken, onTrace, onFinal, onError, signal } = {}
) {
  const res = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      message,
      sessionId,
      context,
      replyToMessageId,
      input_mode: inputMode,
    }),
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

export async function getWorkflowStages(userId, workflowId) {
  return request(
    `/config/workflow/stages?userId=${encodeURIComponent(userId)}` +
    `&workflowId=${encodeURIComponent(workflowId)}`
  )
}

// ---- Activity log (Phase 1) ----
// Filters are AND-combined. cursor is opaque — pass back verbatim for the next page.
export async function listActivity(userId, {
  actorType, eventType, candidateId, workflowId, bulkId,
  since, until, cursor, limit = 50,
} = {}) {
  const qs = new URLSearchParams({ userId, limit: String(limit) })
  if (actorType)    qs.set('actor_type', actorType)
  if (eventType)    qs.set('event_type', eventType)
  if (candidateId)  qs.set('candidate_id', candidateId)
  if (workflowId)   qs.set('workflow_id', workflowId)
  if (bulkId)       qs.set('bulk_id', bulkId)
  if (since)        qs.set('since', since instanceof Date ? since.toISOString() : since)
  if (until)        qs.set('until', until instanceof Date ? until.toISOString() : until)
  if (cursor)       qs.set('cursor', cursor)
  return request(`/activity?${qs.toString()}`)
}

export async function listActivityForCandidate(userId, candidateId, { limit = 100 } = {}) {
  const qs = new URLSearchParams({ userId, limit: String(limit) })
  return request(`/activity/candidate/${encodeURIComponent(candidateId)}?${qs.toString()}`)
}

// ---- Workflow interrupt details + approve (Phase 4 follow-up) ----
export async function getWorkflowInterrupt(userId, threadId) {
  return request(
    `/admin/workflows/${encodeURIComponent(threadId)}/interrupt?userId=${encodeURIComponent(userId)}`,
  )
}

export async function approveWorkflow(userId, threadId, message) {
  return request(
    `/admin/workflows/${encodeURIComponent(threadId)}/approve?userId=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      body: JSON.stringify(message ? { message } : {}),
    },
  )
}

// ---- Candidates (Phase 4 follow-up) ----
// Roster from Zimyo dashboardDataV2 + agent-state overlay. workflow_id is
// optional — backend falls back to admin's saved selection.
export async function listCandidates(userId, {
  workflowId, search, status, page = 1,
} = {}) {
  const qs = new URLSearchParams({ userId, page: String(page) })
  if (workflowId) qs.set('workflow_id', workflowId)
  if (search)     qs.set('search', search)
  if (status)     qs.set('status', status)
  return request(`/admin/candidates?${qs.toString()}`)
}

// ---- Verify Candidate Details ----
// One-shot render payload: { candidate, sections:[{name, fields:[{slug,label,
// position,type,value,mandatory,options}]}], documents:[{name,file}] }.
export async function getCandidateVerify(userId, candidateId) {
  return request(
    `/admin/candidates/${encodeURIComponent(candidateId)}/verify?userId=${encodeURIComponent(userId)}`,
  )
}

// Approve the candidate's details (updatebgvform status=6) + resume the chain.
export async function approveCandidateVerify(userId, candidateId) {
  return request(
    `/admin/candidates/${encodeURIComponent(candidateId)}/verify/approve?userId=${encodeURIComponent(userId)}`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

// Send flagged fields back for re-fill. markedFields: array of
// { slug, section, position, message, corrected_value }.
export async function clarifyCandidateVerify(userId, candidateId, markedFields, finalRemarks = '') {
  return request(
    `/admin/candidates/${encodeURIComponent(candidateId)}/verify/clarify?userId=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ marked_fields: markedFields, final_remarks: finalRemarks }),
    },
  )
}

// ---- Convert to Employee (CURRENT_STEP = 8) ----
// One-shot render payload: { candidate, sections:[{name, slug, section_id,
// fields:[{slug,label,position,type,value,mandatory,master_type,
// options:[{id,name}], max_length, min_length}]}] }. Each field is prefilled
// from the candidate's submitted data; selects carry resolved dropdown options.
export async function getCandidateConvert(userId, candidateId) {
  return request(
    `/admin/candidates/${encodeURIComponent(candidateId)}/convert?userId=${encodeURIComponent(userId)}`,
  )
}

// Submit the (edited) employee-creation form to create the employee + resume
// the chain. `values` is { [slug]: value } collected from the wizard.
export async function submitCandidateConvert(userId, candidateId, values) {
  return request(
    `/admin/candidates/${encodeURIComponent(candidateId)}/convert/submit?userId=${encodeURIComponent(userId)}`,
    { method: 'POST', body: JSON.stringify({ values }) },
  )
}

// ---- Background Verification (CURRENT_STEP = 7) ----
// Form structure: { form_id, sections:[{name, slug, section_id,
// fields:[{slug,label,position,type,mandatory,options,section}]}] }.
export async function getBgvForm(userId, candidateId, formId = 35) {
  return request(
    `/admin/candidates/${encodeURIComponent(candidateId)}/bgv/form?userId=${encodeURIComponent(userId)}&form_id=${encodeURIComponent(formId)}`,
  )
}

// Mint an S3 signed PUT URL for a BGV file upload. Returns the upstream body
// (contains the signed `url`). The browser then PUTs the file to that url.
export async function bgvSignedUrl(userId, candidateId, { key, contentType, fileSize }) {
  return request(
    `/admin/candidates/${encodeURIComponent(candidateId)}/bgv/signed-url?userId=${encodeURIComponent(userId)}`,
    { method: 'POST', body: JSON.stringify({ key, content_type: contentType, file_size: fileSize }) },
  )
}

// Submit the assembled sendBgvData payload (sectioned + CID +
// CHECKED_SECTION_SLUGS). On a paused chain the candidate then waits for the
// vendor; standalone it just logs the request.
export async function submitBgv(userId, candidateId, payload) {
  return request(
    `/admin/candidates/${encodeURIComponent(candidateId)}/bgv/submit?userId=${encodeURIComponent(userId)}`,
    { method: 'POST', body: JSON.stringify({ payload }) },
  )
}

// ---- Workflow cancel (Phase 4) ----
// Admin-initiated cancellation. Reason is required by the backend.
export async function cancelWorkflow(userId, threadId, reason) {
  return request(
    `/admin/workflows/${encodeURIComponent(threadId)}/cancel?userId=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  )
}

// ---- Mission Control workflows (Phase 3) ----
// states: comma-string of state values. Default (omitted) = all non-terminal.
// includeRecentlyCompleted: append terminals from the last N days for the
// "Recently completed" Mission Control section (default 7 days).
export async function listWorkflows(userId, {
  states, bulkId, candidateId,
  includeRecentlyCompleted = false,
  completedWithinDays = 7,
  limit = 100,
} = {}) {
  const qs = new URLSearchParams({ userId, limit: String(limit) })
  if (states && states.length)            qs.set('states', states.join(','))
  if (bulkId)                              qs.set('bulk_id', bulkId)
  if (candidateId)                         qs.set('candidate_id', candidateId)
  if (includeRecentlyCompleted)            qs.set('include_recently_completed', 'true')
  if (completedWithinDays !== 7)           qs.set('completed_within_days', String(completedWithinDays))
  return request(`/admin/workflows?${qs.toString()}`)
}
