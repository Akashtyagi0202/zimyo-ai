import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { listWorkflows, cancelWorkflow } from '@/api/client'
import BulkApprovalCard from '../BulkApprovalCard'

// Renders the chat-inline "Ready to launch — Quick Review" card for a
// bulk-spawn turn. The chat handler emits ui.type=bulk_review with the
// shared bulk_id; this component fetches the sibling workflow rows by
// that bulk_id and hands them to the same BulkApprovalCard the
// /approvals page already uses — so both surfaces stay visually +
// behaviourally identical.
//
// userId comes from localStorage (key `zimyo_user`, set by App.jsx on
// login). Plumbing it through Chat → ChatMessage → MessageRenderer felt
// heavier than this read for one component; if more chat messages need
// it later, lift to a useUser() hook.
function getUserId() {
  try {
    const raw = localStorage.getItem('zimyo_user')
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.userId || u?.userid || u?.id || null
  } catch {
    return null
  }
}

export default function BulkReview({ msg, onAction }) {
  const userId = getUserId()
  const bulkId = msg?.bulk_id
  const fallbackAgents = Array.isArray(msg?.agents) ? msg.agents : []

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRows = useCallback(async () => {
    if (!userId || !bulkId) {
      setLoading(false)
      return
    }
    try {
      const res = await listWorkflows(userId, {
        bulkId,
        states: ['running', 'awaiting_approval', 'waiting_on_candidate', 'completed', 'cancelled'],
      })
      setRows(res?.rows || [])
      setError(null)
    } catch (err) {
      setError(err?.message || 'Failed to load bulk plan')
    } finally {
      setLoading(false)
    }
  }, [userId, bulkId])

  useEffect(() => {
    fetchRows()
    // 10s poll matches Approvals/MissionControl. Stops on unmount.
    const id = setInterval(fetchRows, 10_000)
    return () => clearInterval(id)
  }, [fetchRows])

  // Approve / reject handlers — same shape Approvals page uses. Cancel
  // is reason-less here (no chat modal); a single confirm() keeps the
  // chat UX terse. If admins want a richer reason flow they can do it
  // from /approvals where the modal lives.
  const handleAfterApprove = useCallback((_updatedRow, _status) => {
    // Refetch — graph state may have moved (resumed to next interrupt
    // or completed). Keeps the card showing the current truth instead
    // of a stale ready/needs-input split.
    fetchRows()
  }, [fetchRows])

  const handleRequestReject = useCallback(async (row) => {
    if (!userId || !row?.id) return
    // eslint-disable-next-line no-alert
    const reason = window.prompt(
      `Reject ${row.candidate_id || row.workflow_type}? Reason:`,
      'No longer required',
    )
    if (!reason) return
    try {
      await cancelWorkflow(userId, row.id, reason)
      fetchRows()
    } catch (err) {
      setError(err?.message || 'Cancel failed')
    }
  }, [userId, fetchRows])

  if (!userId) {
    return (
      <div className="border border-amber-200 dark:border-amber-900/60 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 p-4 text-[12px] text-amber-700 dark:text-amber-300">
        Not signed in — can't load the bulk plan. Open this turn from a
        logged-in session.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading bulk plan ({fallbackAgents.length} agents)…
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-4 text-[12px] text-rose-700 dark:text-rose-300">
        {error}
      </div>
    )
  }

  if (rows.length === 0) {
    // Bulk rows already cancelled or pruned. Fall back to the spawn
    // payload's static agent list so the chat history still reads as a
    // bulk event, not a blank bubble.
    return (
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-[12px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
        <div className="font-medium text-slate-700 dark:text-slate-200 mb-1">
          {msg?.title || 'Bulk spawn'}
        </div>
        <div>
          {fallbackAgents.length
            ? `Spawned for: ${fallbackAgents.map(a => a.candidate_name).join(', ')}. `
            : ''}
          These agents are no longer active.
        </div>
      </div>
    )
  }

  if (rows.length === 1) {
    // Lone-survivor bulk — degrade to single-row layout the way the
    // Approvals page does. Hidden bulk header is honest about the shape.
    return (
      <BulkApprovalCard
        rows={rows}
        userId={userId}
        onAfterApprove={handleAfterApprove}
        onRequestReject={handleRequestReject}
      />
    )
  }

  return (
    <BulkApprovalCard
      rows={rows}
      userId={userId}
      onAfterApprove={handleAfterApprove}
      onRequestReject={handleRequestReject}
    />
  )
}
