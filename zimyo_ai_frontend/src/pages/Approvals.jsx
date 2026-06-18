import { useCallback, useEffect, useMemo, useState } from 'react'
import { Inbox, RefreshCw, X } from 'lucide-react'
import { listWorkflows, cancelWorkflow } from '@/api/client'
import ApprovalCard from '@/components/ApprovalCard'
import BulkApprovalCard from '@/components/BulkApprovalCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Group rows so siblings sharing a bulk_id collapse into one BulkApprovalCard
// while solo rows keep rendering as today's ApprovalCard. Output preserves the
// arrival order of the first row in each group, so the inbox doesn't shuffle
// as you approve.
function groupByBulkId(rows) {
  const groups = []
  const indexByBulkId = new Map()
  for (const row of rows) {
    const key = row?.bulk_id
    if (!key) {
      groups.push({ kind: 'single', row })
      continue
    }
    const existing = indexByBulkId.get(key)
    if (existing != null) {
      groups[existing].rows.push(row)
    } else {
      indexByBulkId.set(key, groups.length)
      groups.push({ kind: 'bulk', bulkId: key, rows: [row] })
    }
  }
  // A bulk group with only 1 sibling visible (others completed / cancelled)
  // degrades back to the single-card path — no half-empty Quick Review card.
  return groups.map(g =>
    g.kind === 'bulk' && g.rows.length === 1
      ? { kind: 'single', row: g.rows[0] }
      : g,
  )
}

// Dedicated view of every workflow paused at `awaiting_approval`. Same
// rich card as Mission Control's first section — different chrome (no
// other sections, no terminal noise). Use this when you've got 10 agents
// running and just want the approval queue.
export default function Approvals({ user }) {
  const userId = user?.userId
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Cancel-modal state same as Mission Control. Lifted here so the modal
  // can render once above the list rather than per card.
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true); setError(null)
    try {
      const res = await listWorkflows(userId, {
        states: ['awaiting_approval'],
        limit: 200,
      })
      setRows(res.rows ?? [])
    } catch (err) {
      setError(err?.message || 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetchAll()
    // Same 10s polling as Mission Control; SSE lands in Phase 5.
    const id = setInterval(fetchAll, 10_000)
    return () => clearInterval(id)
  }, [userId, fetchAll])

  const handleAfterApprove = useCallback((updatedRow, status) => {
    if (!updatedRow) return
    // Approved → row's new state may be "completed" (graph reached END) or
    // back to "awaiting_approval" (re-paused at another interrupt). Filter
    // anything not awaiting_approval out so the inbox stays clean.
    setRows(prev => {
      const next = prev.filter(r => r.id !== updatedRow.id)
      if (updatedRow.state === 'awaiting_approval') {
        return [updatedRow, ...next]
      }
      return next
    })
  }, [])

  const handleConfirmCancel = useCallback(async (reason) => {
    if (!userId || !cancelTarget) return
    setCancelBusy(true); setCancelError(null)
    try {
      await cancelWorkflow(userId, cancelTarget.id, reason)
      setRows(prev => prev.filter(r => r.id !== cancelTarget.id))
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

  const groups = useMemo(() => groupByBulkId(rows), [rows])

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-amber-500" />
            Needs Approval
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
            Plans waiting for you. Review the agent's reasoning and the proposed plan, then Approve to run or Reject to close it out.
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

      {error ? (
        <div className="mb-4 px-4 py-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm border border-rose-200 dark:border-rose-900">
          {error}
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-[13px] text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          Nothing waiting for you right now. Agents that pause for approval will land here.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g =>
            g.kind === 'bulk' ? (
              <BulkApprovalCard
                key={`bulk-${g.bulkId}`}
                rows={g.rows}
                userId={userId}
                onAfterApprove={handleAfterApprove}
                onRequestReject={setCancelTarget}
              />
            ) : (
              <ApprovalCard
                key={g.row.id}
                row={g.row}
                userId={userId}
                onAfterApprove={handleAfterApprove}
                onRequestReject={setCancelTarget}
              />
            ),
          )}
        </div>
      )}

      {/* Cancel reason modal — same UX as Mission Control. */}
      {cancelTarget ? (
        <CancelModal
          row={cancelTarget}
          busy={cancelBusy}
          error={cancelError}
          onConfirm={handleConfirmCancel}
          onClose={handleCloseCancel}
        />
      ) : null}
    </div>
  )
}

function CancelModal({ row, busy, error, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()
  const canConfirm = trimmed.length >= 1 && !busy
  return (
    <div className="fixed inset-0 z-30 bg-slate-900/40 dark:bg-slate-950/60 flex items-end sm:items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
              Reject plan
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
              autoFocus rows={3} value={reason} disabled={busy}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Plan looks wrong, candidate dropped, role no longer required…"
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Stored in the audit trail and the workflow's outcome record.
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
            Keep waiting
          </Button>
          <Button size="sm" disabled={!canConfirm}
                  onClick={() => onConfirm(trimmed)}
                  className="text-[12px] h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white">
            {busy ? 'Rejecting…' : 'Reject'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
