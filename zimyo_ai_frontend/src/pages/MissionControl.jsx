import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot, Inbox, CheckCircle2, Hourglass, RefreshCw, X,
  Clock, CircleCheck, CircleX, Loader2, Users,
} from 'lucide-react'
import { listWorkflows, cancelWorkflow, getWorkflowInterrupt } from '@/api/client'
import { Button } from '@/components/ui/button'
import AgentRunDrawer from '@/components/AgentRunDrawer'
import { cn } from '@/lib/utils'

function relativeFrom(iso) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const s = Math.floor(ms / 1000)
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)   return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

const SECTIONS = [
  {
    key: 'running',
    title: 'Running now',
    icon: Bot,
    accent: 'text-violet-600 dark:text-violet-400',
    summary: 'Active agents — executing steps or paused for your approval.',
    layout: 'grid',
  },
  {
    key: 'waiting_on_candidate',
    title: 'Waiting on candidate',
    icon: Hourglass,
    accent: 'text-amber-600 dark:text-amber-400',
    summary: 'Paused for an external event. Resumes automatically when the event arrives.',
    layout: 'grid',
  },
  {
    key: 'completed',
    title: 'Done',
    icon: CheckCircle2,
    accent: 'text-slate-500 dark:text-slate-400',
    summary: 'Completed, failed, or cancelled.',
    layout: 'grid',
    isTerminal: true,
  },
]

// ─── Shared card pieces ──────────────────────────────────────────────

function hashOf(row) {
  return '#' + (row.id?.split(':').slice(-1)[0] || row.workflow_type || '').slice(0, 8)
}

function subtitleOf(row, { withAge = true } = {}) {
  const parts = [row.workflow_type]
  if (withAge && row.started_at) parts.push(`started ${relativeFrom(row.started_at)}`)
  return parts.filter(Boolean).join(' · ')
}

// ─── Running card — purple, "Working" badge ──────────────────────────

function RunningCard({ row, userId, onOpenDetails }) {
  const needsApproval = row.state === 'awaiting_approval'
  const badgeClasses = needsApproval
    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
  const dotClasses = needsApproval ? 'bg-amber-500' : 'bg-emerald-500'

  // Lazy-load interrupt details so the card can show reasoning + plan
  // progress without us having to bake them into the workflow list payload.
  const [details, setDetails] = useState(null)
  useEffect(() => {
    if (!userId || !row?.id) return
    let cancelled = false
    getWorkflowInterrupt(userId, row.id)
      .then(res => { if (!cancelled) setDetails(res) })
      .catch(() => { /* card stays minimal */ })
    return () => { cancelled = true }
  }, [userId, row?.id])

  const candidateMeta = details?.metadata?.find(m => /^candidate/i.test(m.label))
  const cardTitle = candidateMeta?.value
    || (row.candidate_id ? `For ${row.candidate_id}` : row.workflow_type)
  const cardSubtitle = subtitleOf(row)
  const stepText = row.current_step || (details?.next_nodes || []).join(', ')
  const reasoning = details?.reasoning
  const plan = details?.proposed_plan || []
  const doneCount = plan.filter(s => s.status === 'done').length
  const totalSteps = plan.length
  const progressPct = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails?.(row)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails?.(row) } }}
      className="cursor-pointer border border-violet-300 dark:border-violet-800 rounded-2xl bg-violet-50/40 dark:bg-violet-950/10 overflow-hidden hover:border-violet-400 dark:hover:border-violet-700 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-violet-400/40 flex flex-col"
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 truncate">
              {cardTitle}
            </span>
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0', badgeClasses)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', dotClasses)} />
              {needsApproval ? 'Needs approval' : 'Working'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {cardSubtitle}
          </div>
        </div>
      </div>

      {stepText ? (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[12.5px] text-slate-700 dark:text-slate-200">
          <Clock className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span className="truncate">{stepText}</span>
        </div>
      ) : null}

      {reasoning ? (
        <div className="mx-4 mb-3 flex items-start gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-[11.5px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed line-clamp-3 flex-1">
            {reasoning}
          </div>
        </div>
      ) : null}

      <div className="mx-4 mb-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          {row.candidate_id || candidateMeta?.value ? '1 candidate' : '—'}
        </span>
        {totalSteps > 0 ? (
          <span>{doneCount} of {totalSteps} steps done</span>
        ) : null}
      </div>

      {totalSteps > 0 ? (
        <div className="mx-4 mb-3 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500" style={{ width: `${progressPct}%` }} />
        </div>
      ) : null}

      <div className="px-4 pb-3 pt-0 mt-auto">
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
          {hashOf(row)}
        </span>
      </div>
    </div>
  )
}

// ─── Waiting card — amber, paused-at-step block ──────────────────────

function WaitingCard({ row, userId, onOpenDetails }) {
  const waiting = row.waiting_on
  const stepText = row.current_step || (waiting?.event && `Awaiting ${waiting.event}`) || 'Paused'
  const since = waiting?.sent_at || row.updated_at

  // Same lazy interrupt fetch as RunningCard — gives us candidate title,
  // optional supporting metadata (role/from/to), and the agent's
  // reasoning paragraph for the inline preview.
  const [details, setDetails] = useState(null)
  useEffect(() => {
    if (!userId || !row?.id) return
    let cancelled = false
    getWorkflowInterrupt(userId, row.id)
      .then(res => { if (!cancelled) setDetails(res) })
      .catch(() => { /* card stays minimal */ })
    return () => { cancelled = true }
  }, [userId, row?.id])

  const candidateMeta = details?.metadata?.find(m => /^candidate/i.test(m.label))
  const supportingMeta = (details?.metadata || []).find(m => !/^candidate/i.test(m.label))
  const cardTitle = candidateMeta?.value
    || (row.candidate_id ? `For ${row.candidate_id}` : row.workflow_type)
  const secondary = supportingMeta?.value || row.workflow_type
  const reasoning = details?.reasoning
  const remindersLine = typeof waiting?.reminders_sent === 'number' && waiting.reminders_sent > 0
    ? ` · ${waiting.reminders_sent} reminder${waiting.reminders_sent === 1 ? '' : 's'} sent`
    : ''

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails?.(row)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails?.(row) } }}
      className="cursor-pointer border border-amber-300 dark:border-amber-800 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 overflow-hidden hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/40 flex flex-col"
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 text-amber-700 dark:text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 truncate">
              {cardTitle}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
              {hashOf(row)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {secondary}
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="text-[10px] uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80 font-semibold">
          Agent paused at a step
        </div>
        <div className="text-[13px] font-medium text-slate-900 dark:text-slate-100 mt-0.5">
          {stepText}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Waiting {relativeFrom(since)} · resumes automatically when the event arrives{remindersLine}
        </div>
      </div>

      {reasoning ? (
        <div className="mx-4 mb-3 flex items-start gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-[11.5px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed line-clamp-3 flex-1">
            {reasoning}
          </div>
        </div>
      ) : null}

      <div className="mx-4 mb-3 mt-auto flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          {row.candidate_id || candidateMeta?.value ? '1 candidate' : '—'}
        </span>
      </div>
    </div>
  )
}

// ─── Done card — compact, grid-friendly ──────────────────────────────

function DoneCard({ row, userId, onOpenDetails }) {
  const cancelled = row.state === 'cancelled'
  const failed = row.state === 'failed'
  const StatusIcon = (cancelled || failed) ? CircleX : CircleCheck
  const statusLabel = failed ? 'Failed' : cancelled ? 'Cancelled' : 'Completed'
  const badgeTone = failed
    ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
    : cancelled
      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
      : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'

  // Lazily pull the agent's metadata (Candidate / Role / From → To) so
  // each card can show *what* this run was about instead of just the
  // workflow_type. Same endpoint the drawer uses; falls back silently
  // if the graph state has nothing structured.
  const [meta, setMeta] = useState([])
  const [metaLoading, setMetaLoading] = useState(true)

  useEffect(() => {
    let cancelledFetch = false
    if (!userId || !row?.id) return
    setMetaLoading(true)
    getWorkflowInterrupt(userId, row.id)
      .then(res => {
        if (!cancelledFetch) setMeta(Array.isArray(res?.metadata) ? res.metadata : [])
      })
      .catch(() => { /* leave empty; drawer can investigate */ })
      .finally(() => { if (!cancelledFetch) setMetaLoading(false) })
    return () => { cancelledFetch = true }
  }, [userId, row?.id])

  // Prefer Candidate metadata as the card title; fall back to row.candidate_id;
  // last resort the workflow_type (so the card never collapses to an empty header).
  const candidateMeta = meta.find(m => /^candidate/i.test(m.label))
  const cardTitle = candidateMeta?.value || (row.candidate_id ? `For ${row.candidate_id}` : row.workflow_type)
  const cardSubtitle = subtitleOf(row, { withAge: !!row.started_at })

  // Up to 2 supporting metadata items (skip the one used as title).
  const supportingMeta = meta.filter(m => m !== candidateMeta).slice(0, 2)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails?.(row)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails?.(row) } }}
      className="cursor-pointer border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-slate-400/40"
    >
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 truncate">
            {cardTitle}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {cardSubtitle}
          </div>
        </div>
        <span className={cn('text-[10px] font-medium px-2.5 py-1 rounded-full shrink-0', badgeTone)}>
          {statusLabel}
        </span>
      </div>

      {/* Outcome pill — always shown, since this is what tells admin
          what actually happened on this run. */}
      <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[12.5px] text-slate-700 dark:text-slate-200">
        <StatusIcon className={cn('w-3.5 h-3.5 shrink-0', failed ? 'text-rose-500' : cancelled ? 'text-slate-400' : 'text-emerald-500')} />
        <span className="truncate">
          {row.outcome_reason || statusLabel}
        </span>
      </div>

      {/* Supporting metadata strip (Role / From / To / Steps) when present. */}
      {supportingMeta.length > 0 ? (
        <div className="mx-5 mb-4 grid grid-cols-2 gap-3 px-3 py-2.5 rounded-lg bg-slate-50/60 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800">
          {supportingMeta.map((m, i) => (
            <div key={`${m.label}-${i}`} className="min-w-0">
              <div className="text-[9.5px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {m.label}
              </div>
              <div className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">
                {m.value}
              </div>
            </div>
          ))}
        </div>
      ) : metaLoading ? (
        <div className="mx-5 mb-4 flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading run details…
        </div>
      ) : null}

      <div className="px-5 pb-4 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
          {hashOf(row)}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          View details →
        </span>
      </div>
    </div>
  )
}

const CARD_BY_SECTION = {
  running: RunningCard,
  waiting_on_candidate: WaitingCard,
  completed: DoneCard,
}

// Modal asks for a required reason. Closing without confirming is a
// no-op; confirm calls the parent's handler, which deals with the API
// call so this stays presentation-only.
function CancelModal({ row, busy, error, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  if (!row) return null
  const trimmed = reason.trim()
  const canConfirm = trimmed.length >= 1 && !busy
  return (
    <div className="fixed inset-0 z-30 bg-slate-900/40 dark:bg-slate-950/60 flex items-end sm:items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
              Cancel workflow
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {row.candidate_id ? `For ${row.candidate_id}` : row.workflow_type}
              {' · '}<span className="font-mono">{row.workflow_type}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="text-[12px] text-slate-700 dark:text-slate-300">Reason (required)</span>
            <textarea
              autoFocus
              rows={3}
              value={reason}
              disabled={busy}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Candidate dropped, role no longer required, started by mistake…"
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            The reason is stored in the audit trail and the workflow's outcome record. The
            agent learns from it for future similar candidates.
          </p>
          {error ? (
            <div className="px-3 py-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          ) : null}
        </div>
        <footer className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}
                  className="text-[12px] h-8 px-3">
            Keep running
          </Button>
          <Button size="sm" disabled={!canConfirm} onClick={() => onConfirm(trimmed)}
                  className="text-[12px] h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white">
            {busy ? 'Cancelling…' : 'Cancel workflow'}
          </Button>
        </footer>
      </div>
    </div>
  )
}

function Section({ section, rows, userId, onRequestCancel, onOpenDetails }) {
  const Icon = section.icon
  const Card = CARD_BY_SECTION[section.key]
  const isGrid = section.layout === 'grid'
  return (
    <section className="mb-10">
      <header className="flex items-baseline gap-2 mb-3">
        <Icon className={cn('w-4 h-4', section.accent)} />
        <h2 className={cn('text-[14px] font-semibold', section.accent)}>
          {section.title}
        </h2>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">· {rows.length}</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2 truncate">
          {section.summary}
        </span>
      </header>
      {rows.length === 0 ? (
        <div className="px-5 py-6 text-[12px] text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
          {section.isTerminal ? 'Nothing finished in the last 7 days.' : 'Nothing here right now.'}
        </div>
      ) : isGrid ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map(r => (
            <Card
              key={r.id}
              row={r}
              userId={userId}
              onOpenDetails={onOpenDetails}
              onRequestCancel={onRequestCancel}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <Card key={r.id} row={r} onRequestCancel={onRequestCancel} onOpenDetails={onOpenDetails} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function MissionControl({ user }) {
  const userId = user?.userId
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  // Row whose details drawer is open. null = drawer closed.
  const [detailRow, setDetailRow] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true); setError(null)
    try {
      const res = await listWorkflows(userId, {
        includeRecentlyCompleted: true,
        completedWithinDays: 7,
        limit: 200,
      })
      setRows(res.rows ?? [])
    } catch (err) {
      setError(err?.message || 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetchAll()
    const id = setInterval(fetchAll, 10_000)
    return () => clearInterval(id)
  }, [userId, fetchAll])

  const handleConfirmCancel = useCallback(async (reason) => {
    if (!userId || !cancelTarget) return
    setCancelBusy(true); setCancelError(null)
    try {
      const res = await cancelWorkflow(userId, cancelTarget.id, reason)
      setRows(prev => prev.map(r =>
        r.id === cancelTarget.id
          ? (res.workflow ?? { ...r, state: 'cancelled', outcome_reason: reason })
          : r,
      ))
      setCancelTarget(null)
    } catch (err) {
      setCancelError(err?.message || 'Cancel failed')
    } finally {
      setCancelBusy(false)
    }
  }, [userId, cancelTarget])

  const handleCloseCancel = useCallback(() => {
    if (cancelBusy) return
    setCancelTarget(null)
    setCancelError(null)
  }, [cancelBusy])

  // Running bucket shows everything that's currently live — actively
  // executing OR paused at an admin checkpoint. The /approvals page still
  // owns the rich Approve/Reject action surface; Mission Control just
  // wants the workflow visible so admins can see *every* in-flight agent
  // in one place (asked for: "interrupt aane par bhi Running me dikhna
  // chahiye"). Terminal states bucket into Done as before.
  const grouped = useMemo(() => {
    const g = { running: [], waiting_on_candidate: [], completed: [] }
    for (const r of rows) {
      if (r.state === 'completed' || r.state === 'cancelled' || r.state === 'failed') g.completed.push(r)
      else if (r.state === 'running' || r.state === 'awaiting_approval') g.running.push(r)
      else if (r.state === 'waiting_on_candidate') g.waiting_on_candidate.push(r)
      // unknown state: skip
    }
    return g
  }, [rows])

  const approvalCount = rows.filter(r => r.state === 'awaiting_approval').length

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-500" />
            Mission Control
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
            Every agent — what's running, what's paused, and what needs you. Waiting agents resume automatically when their event arrives; trigger one below to test.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAll}
          disabled={loading}
          className="h-8 px-3 text-[12px] gap-1.5 shrink-0"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </header>

      {approvalCount > 0 ? (
        <a
          href="/approvals"
          className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Inbox className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-[13px] text-slate-900 dark:text-slate-100">
              <span className="font-semibold">{approvalCount}</span>
              {' '}plan{approvalCount === 1 ? '' : 's'} waiting for you
            </div>
          </div>
          <span className="text-[12px] text-amber-700 dark:text-amber-400 font-medium">
            Open Needs Approval →
          </span>
        </a>
      ) : null}

      {error ? (
        <div className="mb-4 px-4 py-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm border border-rose-200 dark:border-rose-900">
          {error}
        </div>
      ) : null}

      {SECTIONS.map(section => (
        <Section
          key={section.key}
          section={section}
          rows={grouped[section.key] ?? []}
          userId={userId}
          onRequestCancel={setCancelTarget}
          onOpenDetails={setDetailRow}
        />
      ))}

      <CancelModal
        row={cancelTarget}
        busy={cancelBusy}
        error={cancelError}
        onConfirm={handleConfirmCancel}
        onClose={handleCloseCancel}
      />

      {detailRow ? (
        <AgentRunDrawer
          row={detailRow}
          userId={userId}
          onClose={() => setDetailRow(null)}
          onAfterAction={(updated) => {
            if (updated?.id) {
              setRows(prev => prev.map(r => r.id === updated.id ? updated : r))
            } else {
              fetchAll()
            }
          }}
        />
      ) : null}
    </div>
  )
}
