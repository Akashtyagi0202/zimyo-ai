import { useCallback, useEffect, useState } from 'react'
import { Bot, X, Loader2, AlertCircle, Sparkles, Circle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { approveWorkflow, cancelWorkflow, getWorkflowInterrupt } from '@/api/client'
import { cn } from '@/lib/utils'
import MessageRenderer from './MessageRenderer'
import TracePanel from './messages/TracePanel'

// Side drawer that lazily loads /admin/workflows/{id}/interrupt for any
// row. Renders the same shape the approval card uses (reasoning + plan +
// metadata) but read-only — so admins can inspect Running, Waiting, and
// Done workflows without leaving Mission Control.

function relativeFrom(iso) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

const STATE_TONE = {
  running:             { dot: 'bg-violet-500',  label: 'Running' },
  awaiting_approval:   { dot: 'bg-amber-500',   label: 'Awaiting approval' },
  waiting_on_candidate:{ dot: 'bg-amber-500',   label: 'Waiting on candidate' },
  completed:           { dot: 'bg-emerald-500', label: 'Completed' },
  cancelled:           { dot: 'bg-slate-400',   label: 'Cancelled' },
}

function planStepIcon(status) {
  if (status === 'done')                          return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  if (status === 'failed' || status === 'blocked') return <XCircle      className="w-4 h-4 text-rose-500" />
  if (status === 'active' || status === 'running') return <Clock        className="w-4 h-4 text-violet-500" />
  return <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
}

function planStatusLabel(status) {
  if (status === 'blocked')                          return 'failed'
  if (status === 'active'  || status === 'running')  return 'running'
  return status || 'pending'
}

function planStatusTone(status) {
  if (status === 'done')                              return 'text-emerald-600 dark:text-emerald-400'
  if (status === 'failed' || status === 'blocked')    return 'text-rose-600 dark:text-rose-400'
  if (status === 'active' || status === 'running')    return 'text-violet-600 dark:text-violet-400'
  return 'text-slate-400 dark:text-slate-500'
}

export default function AgentRunDrawer({ row, userId, onClose, onAfterAction }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actioning, setActioning] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async () => {
    if (!userId || !row?.id) return
    setLoading(true); setError(null)
    try {
      const res = await getWorkflowInterrupt(userId, row.id)
      setDetails(res)
    } catch (err) {
      setError(err?.message || 'Failed to load agent details')
    } finally {
      setLoading(false)
    }
  }, [userId, row?.id])

  useEffect(() => { load() }, [load])

  // Inline interrupt action — same serialization shape ApprovalCard /
  // BulkApprovalCard use, so the graph treats a drawer submit identically
  // to /approvals. On 'resumed' (graph re-paused at a new interrupt) we
  // refetch so the drawer swaps to the next form; on 'completed' the row
  // becomes terminal — drawer closes and the parent refetches.
  const handleUiAction = useCallback(async (a) => {
    if (actioning) return
    if (a?.action === 'cancel') {
      // Inline 'cancel' chip on a form means "abort this plan" — same
      // semantics as the footer Cancel button. Reuse that path.
      return
    }
    let message
    if (a?.values)        message = JSON.stringify({ action: a.action, ...a.values })
    else if (a?.action)   message = JSON.stringify({ action: a.action })
    else if (a?.value !== undefined && a?.value !== null) message = String(a.value)
    else return

    setActioning(true); setActionError(null)
    try {
      const res = await approveWorkflow(userId, row.id, message)
      if (res?.status === 'resumed') {
        await load()
      } else {
        onAfterAction?.(res?.workflow, res?.status)
        onClose?.()
      }
    } catch (err) {
      setActionError(err?.message || 'Action failed')
    } finally {
      setActioning(false)
    }
  }, [actioning, userId, row?.id, load, onClose, onAfterAction])

  // Footer Cancel — stop progress, keep what's already done. Reason is
  // required so the cancellation lands in the audit trail and the
  // terminal episode store with admin context.
  const handleCancel = useCallback(async () => {
    if (cancelling || actioning) return
    // eslint-disable-next-line no-alert
    const reason = window.prompt(
      'Stop this agent? Whatever it has already done stays — no further '
      + 'steps will run. Reason (required):',
      'No longer required',
    )
    if (!reason || !reason.trim()) return
    setCancelling(true); setActionError(null)
    try {
      const res = await cancelWorkflow(userId, row.id, reason.trim())
      onAfterAction?.(res?.workflow, 'cancelled')
      onClose?.()
    } catch (err) {
      setActionError(err?.message || 'Cancel failed')
    } finally {
      setCancelling(false)
    }
  }, [cancelling, actioning, userId, row?.id, onClose, onAfterAction])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!row) return null

  const hash = '#' + (row.id?.split(':').slice(-1)[0] || row.workflow_type || '').slice(0, 8)
  const tone = STATE_TONE[row.state] || { dot: 'bg-slate-400', label: row.state }
  const terminal = row.state === 'completed' || row.state === 'cancelled'

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 dark:bg-slate-950/60"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Agent run details"
        className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
      >
        <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              <Bot className="w-4 h-4 text-violet-500" />
              <span>Agent</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">{hash}</span>
            </div>
            <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1">
              Scope: <span className="font-mono">{row.workflow_type}</span>
              {row.started_at ? <> · started {relativeFrom(row.started_at)}</> : null}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status + outcome line */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <span className={cn('w-1.5 h-1.5 rounded-full', tone.dot)} />
              {tone.label}
            </span>
            {terminal && row.outcome_reason ? (
              <span className="text-[12.5px] text-rose-600 dark:text-rose-400">
                {row.outcome_reason}
              </span>
            ) : null}
            {row.bulk_id ? (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                part of #{row.bulk_id}
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading agent details…
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          ) : (
            <>
              {/* Inline interrupt / last-shown card. For non-terminal rows
                  this is the actionable form / chips / approval payload
                  the paused graph emitted — admin acts on it via the same
                  MessageRenderer the chat + /approvals use, same submit
                  serialization. For terminal rows (completed / cancelled)
                  it's the FINAL card the agent left on screen; rendered
                  read-only as historical context so the drawer doesn't
                  feel empty. The drawer checks `ui_msg.type` instead of
                  the narrow `actions[].length` because chips, wizards,
                  checklists, and confirmations don't use that field. */}
              {(() => {
                const uiMsg = details?.ui_msg
                if (!uiMsg?.type) return null
                return (
                  <section
                    aria-busy={actioning}
                    className={cn(
                      'relative rounded-2xl border p-4',
                      terminal
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                        : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10',
                      actioning && 'opacity-60 pointer-events-none',
                    )}
                  >
                    <div
                      className={cn(
                        'text-[10px] uppercase tracking-wider font-semibold mb-2',
                        terminal
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-amber-700 dark:text-amber-300',
                      )}
                    >
                      {terminal ? 'Last shown by agent' : 'Needs your input'}
                    </div>
                    <div className={cn(terminal && 'pointer-events-none opacity-90')}>
                      <MessageRenderer
                        msg={uiMsg}
                        onAction={terminal ? undefined : handleUiAction}
                      />
                    </div>
                    {actioning ? (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 shadow-sm text-[12px] text-slate-700 dark:text-slate-200">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Running…
                        </div>
                      </div>
                    ) : null}
                  </section>
                )
              })()}

              {actionError ? (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {actionError}
                </div>
              ) : null}

              {/* Candidates — single row card style (matches the mockup);
                  shows candidate name with the workflow scope as secondary
                  text. Falls back to candidate_id when name isn't resolved. */}
              {(() => {
                const candMeta = details?.metadata?.find(
                  (m) => (m.label || '').toLowerCase() === 'candidate',
                )
                const candName = candMeta?.value
                  || row.candidate_name
                  || details?.candidate_id
                  || row.candidate_id
                const extras = (details?.metadata || []).filter(
                  (m) => (m.label || '').toLowerCase() !== 'candidate',
                )
                if (!candName && extras.length === 0) return null
                return (
                  <section>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
                      Candidates
                    </div>
                    {candName ? (
                      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
                        <span className="text-[13.5px] font-medium text-slate-800 dark:text-slate-100 truncate">
                          {candName}
                        </span>
                        <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                          {row.workflow_type}
                        </span>
                      </div>
                    ) : null}
                    {extras.length > 0 ? (
                      <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {extras.map((m, i) => (
                          <div key={`${m.label}-${i}`} className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {m.label}
                            </div>
                            <div className="text-[12.5px] font-medium text-slate-800 dark:text-slate-200 truncate">
                              {m.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>
                )
              })()}

              {/* Plan — checklist-style rows with a leading status icon,
                  step label, optional note, and a right-aligned status pill
                  matching the mockup. */}
              {(details?.proposed_plan?.length ?? 0) > 0 ? (
                <section>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
                    Plan
                  </div>
                  <ol className="space-y-2">
                    {details.proposed_plan.map((step, i) => {
                      const active = step.status === 'active' || step.status === 'running'
                      const failed = step.status === 'failed' || step.status === 'blocked'
                      return (
                        <li
                          key={`${step.label}-${i}`}
                          className={cn(
                            'flex items-start gap-3 px-4 py-3 rounded-xl border',
                            active
                              ? 'bg-violet-50/40 dark:bg-violet-500/5 border-violet-300 dark:border-violet-500/40'
                              : failed
                                ? 'bg-rose-50/40 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/40'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                          )}
                        >
                          <div className="pt-0.5 shrink-0">{planStepIcon(step.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                              {step.label}
                            </div>
                            {step.note ? (
                              <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {step.note}
                              </div>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-medium uppercase tracking-wider shrink-0 pt-1',
                              planStatusTone(step.status),
                            )}
                          >
                            {planStatusLabel(step.status)}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </section>
              ) : null}

              {/* Agent reasoning — short narrative paragraph styled to match
                  the mockup. Mono only for trace-style nodes; the typical
                  reasoning is plain prose. */}
              {details?.reasoning ? (
                <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
                    <Sparkles className="w-3 h-3 text-violet-500" />
                    Agent reasoning
                    <span className={cn('w-1.5 h-1.5 rounded-full ml-0.5', tone.dot)} />
                  </div>
                  <div className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {details.reasoning}
                  </div>
                </section>
              ) : null}

              {/* Execution trace — same collapsible per-event view the chat
                  (Conversations) uses, so Mission Control and chat render
                  traces identically. Only present when the backend ran with
                  TRACE=true. */}
              {details?.traces?.length ? (
                <TracePanel traces={details.traces} />
              ) : null}

              {/* Per-candidate outcomes — surfaced from any `expandableSections`
                  the agent attached to the final card payload. The bulk_action
                  reduce emits Succeeded / Failed sections so admins can see
                  *which* candidate failed and why, not just the tally. */}
              {Array.isArray(details?.ui_msg?.expandableSections) && details.ui_msg.expandableSections.length > 0 ? (
                <section>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
                    Outcomes
                  </div>
                  <div className="space-y-2">
                    {details.ui_msg.expandableSections.map((sec) => {
                      const isFailure = /fail/i.test(sec.title || sec.id || '')
                      const isSuccess = /success|succeeded/i.test(sec.title || sec.id || '')
                      return (
                        <details
                          key={sec.id || sec.title}
                          open={sec.defaultExpanded}
                          className={cn(
                            'rounded-xl border overflow-hidden',
                            isFailure
                              ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/10'
                              : isSuccess
                                ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/10'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
                          )}
                        >
                          <summary
                            className={cn(
                              'cursor-pointer select-none px-4 py-2.5 text-[12.5px] font-medium flex items-center gap-2',
                              isFailure
                                ? 'text-rose-700 dark:text-rose-300'
                                : isSuccess
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-slate-700 dark:text-slate-200',
                            )}
                          >
                            {isFailure ? <XCircle className="w-3.5 h-3.5" /> : isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                            {sec.title}
                          </summary>
                          <div className="px-4 pb-3 pt-1 text-[12.5px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {sec.content}
                          </div>
                        </details>
                      )
                    })}
                  </div>
                </section>
              ) : null}

              {/* If nothing structured loaded, at least give the admin
                  something — the current step + the title from api_result. */}
              {!details?.reasoning && !details?.proposed_plan?.length && !details?.metadata?.length ? (
                <div className="text-[12.5px] text-slate-500 dark:text-slate-400 italic">
                  No structured trace recorded for this run.
                  {row.current_step ? <> Last step: <span className="font-mono not-italic">{row.current_step}</span>.</> : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {!terminal ? (
            <button
              onClick={handleCancel}
              disabled={cancelling || actioning}
              title="Stop the agent — whatever it has already done stays, no further steps run."
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900 disabled:opacity-50 transition-colors"
            >
              {cancelling
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <XCircle className="w-3.5 h-3.5" />}
              {cancelling ? 'Cancelling…' : 'Cancel agent'}
            </button>
          ) : <span />}
          <button
            onClick={onClose}
            disabled={cancelling}
            className="text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50"
          >
            Close
          </button>
        </footer>
      </aside>
    </>
  )
}
