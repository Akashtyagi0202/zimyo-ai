import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot, Check, X, Loader2, AlertCircle,
  ChevronDown, ChevronRight, Sparkles,
} from 'lucide-react'
import { approveWorkflow, cancelWorkflow, getWorkflowInterrupt } from '@/api/client'
import { cn } from '@/lib/utils'
import MessageRenderer from './MessageRenderer'
import BulkQuickReviewForm from './BulkQuickReviewForm'

// Phase A scaffolding for the video's "Ready to launch — Quick Review" layout.
// Renders N sibling approval rows (sharing a bulk_id) as one consolidated card:
// candidate avatars + journey chips, a "Same for everyone" slot (Phase B will
// fill via input-field intersection), a "Personal details" section with
// per-candidate collapsibles, and a single "Launch all N" footer.
//
// N == 1 callers should keep using ApprovalCard directly — this component
// assumes rows.length >= 2 and the parent does the routing.
export default function BulkApprovalCard({
  rows,
  userId,
  onAfterApprove,   // (updatedRow, status) => void  — fired per row
  onRequestReject,  // (row) => void                 — single-row reject still routes through parent modal
}) {
  const [perRow, setPerRow] = useState({})   // { [rowId]: { details, loading, error, approving, approveError } }
  const [expanded, setExpanded] = useState(new Set([rows[0]?.id]))
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState(null)
  const [cancellingAll, setCancellingAll] = useState(false)

  // Fetch interrupt details for every row in parallel — same lazy load as
  // ApprovalCard, but folded into a single state map so we can drive bulk
  // actions off the aggregate ready/blocked status.
  const fetchOne = useCallback(async (rowId) => {
    if (!userId || !rowId) return
    setPerRow(prev => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), loading: true, error: null },
    }))
    try {
      const res = await getWorkflowInterrupt(userId, rowId)
      setPerRow(prev => ({
        ...prev,
        [rowId]: { ...(prev[rowId] || {}), details: res, loading: false },
      }))
    } catch (err) {
      setPerRow(prev => ({
        ...prev,
        [rowId]: {
          ...(prev[rowId] || {}),
          error: err?.message || 'Failed to load interrupt details',
          loading: false,
        },
      }))
    }
  }, [userId])

  useEffect(() => {
    rows.forEach(r => fetchOne(r.id))
    // Re-fetch only when the row id set changes — not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => r.id).join('|'), userId])

  const candidateLabel = useCallback((row) => {
    const d = perRow[row.id]?.details
    const fromMeta = d?.metadata?.find(m => /candidate/i.test(m.label || ''))
    return fromMeta?.value || row.candidate_id || row.workflow_type
  }, [perRow])

  const journeyChips = useMemo(() => {
    // Union of proposed_plan step labels across rows, preserving first-seen
    // order. Lets the header chip strip read like "CTC › Send Joining Form ›
    // …" exactly as in the video — single source of truth across candidates.
    const seen = new Set()
    const out = []
    for (const r of rows) {
      const plan = perRow[r.id]?.details?.proposed_plan || []
      for (const step of plan) {
        const label = step?.label
        if (!label || seen.has(label)) continue
        seen.add(label)
        out.push(label)
      }
    }
    return out
  }, [rows, perRow])

  const allLoaded = rows.every(r => perRow[r.id]?.details && !perRow[r.id]?.loading)
  const anyError = rows.some(r => perRow[r.id]?.error)
  // A row "needs input" when its paused-graph emitted a structured form
  // (ui_msg with its own actions[]). Launch all must NOT fire on those —
  // the per-row form has its own Submit button that pushes the real
  // payload. We surface the gate clearly in the button label too.
  const anyNeedsInput = rows.some(r => {
    const u = perRow[r.id]?.details?.ui_msg
    return !!(u && Array.isArray(u.actions) && u.actions.length > 0)
  })
  // When every row carries a form interrupt, render the aggregated Quick
  // Review form (BulkQuickReviewForm) — shared field intersection at
  // the top + per-person sections below + ONE Launch all. Replaces the
  // per-row collapsible+MessageRenderer body. Mixed mode (some rows at
  // form, some at plan) keeps the older layout so per-row actions still
  // surface correctly via the embedded MessageRenderer.
  const allRowsHaveForms = allLoaded && !anyError && rows.length > 0 && rows.every(r => {
    const u = perRow[r.id]?.details?.ui_msg
    return !!(u && Array.isArray(u.actions) && u.actions.length > 0)
  })

  const toggleExpand = useCallback((rowId) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId); else next.add(rowId)
      return next
    })
  }, [])

  // Launch-all fires approveWorkflow for every row in parallel. Each row's
  // outcome (resumed / completed / failed) is bubbled to the parent via
  // onAfterApprove so the parent's row list state stays accurate even if
  // some rows resume to a new interrupt and others terminate cleanly.
  const handleLaunchAll = useCallback(async () => {
    if (launching) return
    setLaunching(true); setLaunchError(null)
    const results = await Promise.allSettled(
      rows.map(r => approveWorkflow(userId, r.id, undefined)),
    )
    const failures = []
    results.forEach((res, idx) => {
      const row = rows[idx]
      if (res.status === 'fulfilled') {
        const r = res.value
        onAfterApprove?.(r.workflow, r.status)
        if (r.status === 'resumed') {
          // Refresh that row's interrupt details so its expanded panel
          // shows the next paused step instead of the stale prior one.
          fetchOne(row.id)
        }
      } else {
        failures.push({ row, err: res.reason })
        setPerRow(prev => ({
          ...prev,
          [row.id]: {
            ...(prev[row.id] || {}),
            approveError: res.reason?.message || 'Approve failed',
          },
        }))
      }
    })
    if (failures.length) {
      setLaunchError(
        `${failures.length} of ${rows.length} failed — ${failures
          .map(f => candidateLabel(f.row))
          .join(', ')}. Review per-candidate error below.`,
      )
    }
    setLaunching(false)
  }, [launching, rows, userId, onAfterApprove, fetchOne, candidateLabel])

  // Per-row inline approve (used by the embedded MessageRenderer form). Same
  // payload shape ApprovalCard uses, so the graph can't tell the two callers
  // apart.
  const submitRowApprove = useCallback(async (row, message) => {
    setPerRow(prev => ({
      ...prev,
      [row.id]: { ...(prev[row.id] || {}), approving: true, approveError: null },
    }))
    try {
      const res = await approveWorkflow(userId, row.id, message)
      if (res.status === 'resumed') await fetchOne(row.id)
      onAfterApprove?.(res.workflow, res.status)
    } catch (err) {
      setPerRow(prev => ({
        ...prev,
        [row.id]: {
          ...(prev[row.id] || {}),
          approveError: err?.message || 'Approve failed',
        },
      }))
    } finally {
      setPerRow(prev => ({
        ...prev,
        [row.id]: { ...(prev[row.id] || {}), approving: false },
      }))
    }
  }, [userId, onAfterApprove, fetchOne])

  // Cancel-all collects ONE reason and fires cancelWorkflow per row in
  // parallel — replaces the earlier `rows.forEach(r => onRequestReject(r))`
  // which used to pop the parent's cancel modal N times. Each successful
  // cancel bubbles up via onAfterApprove(updatedRow, 'cancelled') so the
  // parent's row list updates the same way it does on a single-row
  // reject from the per-row footer.
  const handleCancelAll = useCallback(async () => {
    if (cancellingAll || launching) return
    // eslint-disable-next-line no-alert
    const reason = window.prompt(
      `Cancel all ${rows.length} agents? Reason (required):`,
      'No longer required',
    )
    if (!reason || !reason.trim()) return
    setCancellingAll(true); setLaunchError(null)
    const results = await Promise.allSettled(
      rows.map(r => cancelWorkflow(userId, r.id, reason.trim())),
    )
    const failures = []
    results.forEach((res, idx) => {
      const row = rows[idx]
      if (res.status === 'fulfilled') {
        onAfterApprove?.(res.value?.workflow || { ...row, state: 'cancelled' }, 'cancelled')
      } else {
        failures.push({ row, err: res.reason })
      }
    })
    if (failures.length) {
      setLaunchError(
        `${failures.length} of ${rows.length} cancellations failed — ${failures
          .map(f => candidateLabel(f.row))
          .join(', ')}.`,
      )
    }
    setCancellingAll(false)
  }, [cancellingAll, launching, rows, userId, onAfterApprove, candidateLabel])

  const handleRowUiAction = useCallback((row, a) => {
    if (a?.action === 'cancel') {
      onRequestReject?.(row)
      return
    }
    let message
    if (a?.values)        message = JSON.stringify({ action: a.action, ...a.values })
    else if (a?.action)   message = JSON.stringify({ action: a.action })
    else if (a?.value !== undefined && a?.value !== null) message = String(a.value)
    else return
    submitRowApprove(row, message)
  }, [submitRowApprove, onRequestReject])

  // ─── render ────────────────────────────────────────────────────────────
  const hash = '#bulk-' + (rows[0]?.bulk_id?.slice(0, 8) || rows[0]?.id?.split(':').slice(-1)[0]?.slice(0, 8) || '')

  return (
    <div className="border border-amber-200 dark:border-amber-900/60 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 overflow-hidden">
      {/* Header — Ready to launch banner + avatars + workflow type strip */}
      <header className="px-5 py-4 border-b border-amber-100 dark:border-amber-900/40">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-300 mb-1">
              Ready to launch — Quick Review
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {rows.map((r) => (
                <Avatar key={r.id} label={candidateLabel(r)} />
              ))}
              <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                {rows.map(candidateLabel).join(' & ')}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
            {hash}
          </span>
        </div>

        {journeyChips.length ? (
          <div className="mt-3 flex items-center flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mr-1">
              Journey
            </span>
            {journeyChips.slice(0, 6).map((label, i) => (
              <span
                key={`${label}-${i}`}
                className="px-2 py-0.5 text-[11px] rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {label}
              </span>
            ))}
            {journeyChips.length > 6 ? (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                +{journeyChips.length - 6} more
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {allRowsHaveForms ? (
        <div className="px-5 py-4">
          <BulkQuickReviewForm
            rows={rows}
            perRow={perRow}
            userId={userId}
            candidateLabel={candidateLabel}
            onAfterApprove={(updated, status) => {
              onAfterApprove?.(updated, status)
              // Form mode: graph may have moved past this interrupt
              // (resumed to next form OR completed). Refresh each row's
              // details so the card swaps to whatever's next on screen.
              rows.forEach(r => fetchOne(r.id))
            }}
            onAfterCancel={() => {
              rows.forEach(r => fetchOne(r.id))
            }}
          />
        </div>
      ) : (<>
      <div className="px-5 py-4 space-y-4">
        {/* "Same for everyone" — Phase A leaves this as a placeholder; Phase B
            will populate it by intersecting the per-row interrupt input
            schemas and lifting shared fields up here. */}
        <section>
          <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            Same for everyone
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Set once — applies to all {rows.length} candidates. (Detection of
            shared inputs lands in the next slice.)
          </div>
        </section>

        {/* Personal details — per-candidate collapsible cards */}
        <section>
          <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            Personal details
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Different value per person. Tap to expand and fill what each one needs.
          </div>

          <div className="mt-3 space-y-2">
            {rows.map((row) => {
              const slot = perRow[row.id] || {}
              const isOpen = expanded.has(row.id)
              const isReady = !!slot.details && !slot.error && !slot.details?.ui_msg
              return (
                <div
                  key={row.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(row.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <Avatar label={candidateLabel(row)} />
                    <div className="flex-1 min-w-0 text-[13px] font-medium text-slate-900 dark:text-slate-100 truncate">
                      {candidateLabel(row)}
                    </div>
                    {isReady ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        Ready
                      </span>
                    ) : slot.error ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                        Error
                      </span>
                    ) : slot.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        Needs input
                      </span>
                    )}
                  </button>

                  {isOpen ? (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      {slot.loading ? (
                        <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Loading…
                        </div>
                      ) : slot.error ? (
                        <ErrorStrip msg={slot.error} />
                      ) : slot.details ? (
                        <RowBody
                          details={slot.details}
                          approving={slot.approving}
                          approveError={slot.approveError}
                          onUiAction={(a) => handleRowUiAction(row, a)}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>

        {launchError ? <ErrorStrip msg={launchError} /> : null}
      </div>

      <footer className="px-5 py-3 border-t border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/5 flex items-center justify-end gap-2">
        <button
          onClick={handleCancelAll}
          disabled={launching || cancellingAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900 disabled:opacity-50 transition-colors"
        >
          {cancellingAll
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <X className="w-3.5 h-3.5" />}
          {cancellingAll ? 'Cancelling…' : (rows.length === 1 ? 'Cancel' : 'Cancel all')}
        </button>
        <button
          onClick={handleLaunchAll}
          disabled={launching || cancellingAll || !allLoaded || anyError || anyNeedsInput}
          title={anyNeedsInput ? 'Fill each per-person form above first' : undefined}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
        >
          {launching
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Check className="w-3.5 h-3.5" />}
          {launching
            ? 'Launching…'
            : anyNeedsInput
              ? 'Fill inputs above first'
              : (rows.length === 1
                  ? 'Looks good — launch'
                  : `Looks good — launch all ${rows.length}`)}
        </button>
      </footer>
      </>)}
    </div>
  )
}

function Avatar({ label }) {
  const initials = (label || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || '?'
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-semibold shrink-0">
      {initials}
    </div>
  )
}

function ErrorStrip({ msg }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      {msg}
    </div>
  )
}

function RowBody({ details, approving, approveError, onUiAction }) {
  const uiMsg = details?.ui_msg
  const uiOwnsActions = !!(uiMsg && Array.isArray(uiMsg.actions) && uiMsg.actions.length > 0)
  return (
    <>
      {details?.reasoning ? (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
            Agent reasoning
          </div>
          <div className="text-[12.5px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto font-mono">
            {details.reasoning}
          </div>
        </div>
      ) : null}

      {uiOwnsActions ? (
        <div
          aria-busy={approving}
          className={cn('relative transition-opacity', approving && 'opacity-60 pointer-events-none')}
        >
          <MessageRenderer msg={uiMsg} onAction={onUiAction} />
          {approving ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 shadow-sm text-[12px] text-slate-700 dark:text-slate-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Running…
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {details?.proposed_plan?.length ? (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
            Proposed plan
          </div>
          <ol className="space-y-1.5">
            {details.proposed_plan.map((step, i) => (
              <li
                key={`${step.label}-${i}`}
                className="flex items-center gap-3 text-[12.5px] text-slate-700 dark:text-slate-200"
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    step.status === 'done'
                      ? 'bg-emerald-500'
                      : step.status === 'failed'
                        ? 'bg-rose-500'
                        : 'bg-slate-300 dark:bg-slate-600',
                  )}
                />
                <span className="truncate">{step.label}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {approveError ? <ErrorStrip msg={approveError} /> : null}
    </>
  )
}
