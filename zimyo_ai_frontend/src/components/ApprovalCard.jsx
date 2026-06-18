import { useCallback, useEffect, useState } from 'react'
import { Bot, Check, X, Loader2, AlertCircle } from 'lucide-react'
import { approveWorkflow, getWorkflowInterrupt } from '@/api/client'
import { cn } from '@/lib/utils'
import MessageRenderer from './MessageRenderer'
import VerifyReviewCard from './VerifyReviewCard'
import ConvertEmployeeCard from './ConvertEmployeeCard'
import BGVCard from './BGVCard'

// Rich approval card used in both Mission Control's "Needs your approval"
// section and the dedicated /approvals page. Lazily fetches interrupt
// details (reasoning + plan + metadata) per row so the heavy graph reads
// don't run unless the user actually sees the card.
export default function ApprovalCard({
  row,
  userId,
  onAfterApprove,  // (updatedRow, status) => void
  onRequestReject, // (row) => void  — parent opens its existing cancel modal
}) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState(null)

  const fetchDetails = useCallback(async () => {
    if (!userId || !row?.id) return
    setLoading(true); setError(null)
    try {
      const res = await getWorkflowInterrupt(userId, row.id)
      setDetails(res)
    } catch (err) {
      setError(err?.message || 'Failed to load interrupt details')
    } finally {
      setLoading(false)
    }
  }, [userId, row?.id])

  useEffect(() => { fetchDetails() }, [fetchDetails])

  const submitApprove = useCallback(async (message) => {
    if (approving) return
    setApproving(true); setApproveError(null)
    try {
      const res = await approveWorkflow(userId, row.id, message)
      // If the graph re-paused (status === 'resumed'), the new pause likely
      // carries a different ui_msg/reasoning. Refetch so the card swaps to
      // the next form/step immediately instead of showing the stale one.
      // For 'completed' the parent will unmount the row, so skip the round-trip.
      if (res.status === 'resumed') {
        await fetchDetails()
      }
      onAfterApprove?.(res.workflow, res.status)
    } catch (err) {
      setApproveError(err?.message || 'Approve failed')
    } finally {
      setApproving(false)
    }
  }, [approving, userId, row?.id, onAfterApprove, fetchDetails])

  const handleApprove = useCallback(() => submitApprove(), [submitApprove])

  // Form/wizard submit from the embedded MessageRenderer. Mirrors the chat's
  // serialization in ChatMessage so the graph can't tell the two callers
  // apart: action+values → JSON string → resume.
  const handleUiAction = useCallback((a) => {
    if (a?.action === 'cancel') {
      onRequestReject?.(row)
      return
    }
    let message
    if (a?.values) {
      message = JSON.stringify({ action: a.action, ...a.values })
    } else if (a?.action) {
      message = JSON.stringify({ action: a.action })
    } else if (a?.value !== undefined && a?.value !== null) {
      message = String(a.value)
    } else {
      return
    }
    submitApprove(message)
  }, [submitApprove, onRequestReject, row])

  const title = details?.title
    || (row.candidate_id ? `Needs your okay — ${row.candidate_id}` : `Needs your okay — ${row.workflow_type}`)
  const stepLabel = details?.next_nodes?.join(', ') || row.current_step || ''
  const hash = '#' + (row.id?.split(':').slice(-1)[0] || '').slice(0, 8)

  // Structured UI payload from the paused graph. Anything that ships its
  // own actions[] (form, wizard, confirmation, approval, …) gets rendered
  // via MessageRenderer — the same widget chat uses — and the card footer
  // is hidden so the user doesn't see two competing primary buttons. The
  // graph-defined action ids ("run_chain", "edit", "cancel") matter, so we
  // can't fall back to the generic "approve" footer.
  const uiMsg = details?.ui_msg
  // A payload "owns its actions" when it ships an actions[] array (form /
  // wizard / confirmation) — those include their own cancel, so we hide the
  // whole footer. A chips picker (e.g. "Multiple candidates matched — pick
  // one") instead ships chips[] with no cancel chip; we still render it via
  // MessageRenderer (clicking a chip resumes the graph with that value) but
  // keep the footer's Reject so the admin can bail. The generic "Approve &
  // Run" is suppressed for pickers — an empty approve can't satisfy a "pick
  // one" interrupt.
  const uiOwnsActions = !!(uiMsg && Array.isArray(uiMsg.actions) && uiMsg.actions.length > 0)
  const uiIsPicker = !!(uiMsg && uiMsg.type === 'chips' && Array.isArray(uiMsg.chips) && uiMsg.chips.length > 0)
  const uiNeedsInput = uiOwnsActions || uiIsPicker

  // Verify Candidate Details pause → render the dedicated review screen
  // (sections + mark-error + documents + Approve/Clarify) instead of the
  // generic plan card. The verify card owns its own actions, so the footer
  // is hidden like the ui_msg case.
  const isVerify = details?.pause_kind === 'verify_candidate' && !!row.candidate_id

  // Convert to Employee pause → render the employee-creation wizard (sections
  // + prefilled editable fields + dropdowns + Convert). Owns its own actions,
  // so the footer is hidden like verify/ui_msg.
  const isConvert = details?.pause_kind === 'convert_employee' && !!row.candidate_id

  // Background Verification pause → render the multi-section BGV form (fields +
  // file uploads + Submit). Owns its own actions, so the footer is hidden like
  // verify/convert. After submit the candidate waits for the vendor.
  const isBgv = details?.pause_kind === 'background_verification' && !!row.candidate_id

  return (
    <div className="border border-amber-200 dark:border-amber-900/60 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 overflow-hidden">
      <header className="px-5 py-4 flex items-start gap-3 border-b border-amber-100 dark:border-amber-900/40">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-amber-700 dark:text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {(details?.proposed_plan?.length ?? 0) > 0
              ? `${details.proposed_plan.length} steps`
              : 'No structured plan'} · {row.workflow_type}
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
          {hash}
        </span>
      </header>

      <div className="px-5 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading interrupt details…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {error}
          </div>
        ) : isVerify ? (
          <VerifyReviewCard
            candidateId={row.candidate_id}
            userId={userId}
            onDone={(action) => onAfterApprove?.(
              { ...row, state: action === 'approve' ? 'completed' : 'awaiting_approval' },
              'resumed',
            )}
          />
        ) : isConvert ? (
          <ConvertEmployeeCard
            candidateId={row.candidate_id}
            userId={userId}
            onDone={() => onAfterApprove?.(
              { ...row, state: 'completed' },
              'resumed',
            )}
          />
        ) : isBgv ? (
          <BGVCard
            candidateId={row.candidate_id}
            userId={userId}
            onDone={() => onAfterApprove?.(
              // Submit ok → chain waits for the vendor (or standalone done).
              { ...row, state: 'waiting_on_candidate' },
              'resumed',
            )}
          />
        ) : (
          <>
            {/* Agent reasoning */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
                Agent reasoning
              </div>
              {details?.reasoning ? (
                <div className="text-[12.5px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-3 max-h-48 overflow-y-auto font-mono">
                  {details.reasoning}
                </div>
              ) : (
                <div className="text-[12px] text-slate-400 dark:text-slate-500 italic">
                  The agent didn't emit a narration for this pause.
                </div>
              )}
            </div>

            {/* Metadata strip — e.g. Candidate / From / To / Steps */}
            {details?.metadata?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg">
                {details.metadata.map((m, i) => (
                  <div key={`${m.label}-${i}`} className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {m.label}
                    </div>
                    <div className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Inline form / wizard from the paused graph — same widget the
                chat assistant renders, so the admin can fill the inputs and
                resume right here. Dim + lock during submit so the user sees
                the click landed and can't fire it twice. */}
            {uiNeedsInput ? (
              <div
                aria-busy={approving}
                className={cn(
                  'relative transition-opacity',
                  approving && 'opacity-60 pointer-events-none',
                )}
              >
                <MessageRenderer msg={uiMsg} onAction={handleUiAction} />
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

            {/* Proposed plan */}
            {details?.proposed_plan?.length ? (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
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

            {stepLabel ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Paused at <span className="font-mono">{stepLabel}</span>
              </div>
            ) : null}

            {approveError ? (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {approveError}
              </div>
            ) : null}
          </>
        )}
      </div>

      {uiOwnsActions || isVerify || isConvert || isBgv ? null : (
        <footer className="px-5 py-3 border-t border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/5 flex items-center justify-end gap-2">
          <button
            onClick={() => onRequestReject?.(row)}
            disabled={approving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900 disabled:opacity-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
          {/* Picker interrupts are answered by clicking a chip above — an empty
              "approve" can't resolve a "pick one", so hide the Approve button. */}
          {uiIsPicker ? null : (
            <button
              onClick={handleApprove}
              disabled={approving || loading || !!error}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
            >
              {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {approving ? 'Approving…' : 'Approve & Run'}
            </button>
          )}
        </footer>
      )}
    </div>
  )
}
