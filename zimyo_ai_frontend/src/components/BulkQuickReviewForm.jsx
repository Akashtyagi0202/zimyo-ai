import { useCallback, useMemo, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { approveWorkflow, cancelWorkflow } from '@/api/client'
import { FieldRenderer } from './messages/_FieldRenderer'
import { cn } from '@/lib/utils'

// Aggregated Quick Review form used when every spawned thread is paused
// at its combined-form interrupt. Replaces N independent per-row
// MessageRenderer instances with:
//   - ONE "Same for everyone" section for fields whose schema + default
//     value are identical across all rows
//   - Per-person sections with only fields that vary (or that don't exist
//     in every row)
//   - ONE "Launch all N" button that fires approveWorkflow per row,
//     posting each row's merged shared+unique values via the action id
//     declared in its own ui_msg.actions[0].
//
// Pure controlled component for its own values. Sibling BulkApprovalCard
// stays in charge of header (avatars / journey chips) and decides when
// to render this vs. its older per-row collapsible layout.

function defaultForType(field) {
  if (!field) return ''
  if (field.type === 'toggle' || field.type === 'checkbox') return false
  return ''
}

// Group fields from N parallel forms by id. A field counts as "shared"
// when present in every row AND every row carries the same defaultValue
// (JSON-stringified for deep equality). Everything else lands in
// per-row buckets so admin sees each candidate's own value.
function classifyFields(rows, perRow) {
  const byId = new Map()
  for (const r of rows) {
    const fields = perRow[r.id]?.details?.ui_msg?.fields || []
    for (const f of fields) {
      if (!byId.has(f.id)) byId.set(f.id, {})
      byId.get(f.id)[r.id] = f
    }
  }

  const shared = []
  const perRowFields = {}
  for (const r of rows) perRowFields[r.id] = []

  for (const [, entry] of byId) {
    const inAllRows = Object.keys(entry).length === rows.length
    if (!inAllRows) {
      for (const [rid, f] of Object.entries(entry)) {
        perRowFields[rid].push(f)
      }
      continue
    }
    const defs = Object.values(entry).map(f => JSON.stringify(f.defaultValue ?? null))
    const allSame = defs.every(d => d === defs[0])
    if (allSame) {
      shared.push(Object.values(entry)[0])
    } else {
      for (const [rid, f] of Object.entries(entry)) {
        perRowFields[rid].push(f)
      }
    }
  }

  // Submit action id taken from the first row's first declared action;
  // graph-emitted forms across sibling threads share the same action set.
  const firstUi = perRow[rows[0]?.id]?.details?.ui_msg
  const actionId = firstUi?.actions?.[0]?.id || 'submit'

  return { shared, perRow: perRowFields, actionId }
}

export default function BulkQuickReviewForm({
  rows,
  perRow,
  userId,
  candidateLabel,
  onAfterApprove,        // (updatedRow, status) → void
  onAfterCancel,         // () → void (parent refetches)
}) {
  const { shared, perRow: perRowFields, actionId } = useMemo(
    () => classifyFields(rows, perRow), [rows, perRow],
  )

  const [sharedValues, setSharedValues] = useState(() => {
    const v = {}
    for (const f of shared) v[f.id] = f.defaultValue ?? defaultForType(f)
    return v
  })
  const [rowValues, setRowValues] = useState(() => {
    const v = {}
    for (const r of rows) {
      v[r.id] = {}
      for (const f of perRowFields[r.id] || []) {
        v[r.id][f.id] = f.defaultValue ?? defaultForType(f)
      }
    }
    return v
  })
  const [errors, setErrors] = useState({})
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

  const validateAll = useCallback(() => {
    const next = {}
    for (const f of shared) {
      if (f.required && isEmpty(sharedValues[f.id])) next[`shared:${f.id}`] = 'Required'
    }
    for (const r of rows) {
      for (const f of perRowFields[r.id] || []) {
        if (f.required && isEmpty(rowValues[r.id]?.[f.id])) {
          next[`${r.id}:${f.id}`] = 'Required'
        }
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }, [shared, perRowFields, sharedValues, rowValues, rows])

  const handleLaunchAll = useCallback(async () => {
    if (launching) return
    if (!validateAll()) return
    setLaunching(true); setLaunchError(null)
    const submits = rows.map(r => {
      const merged = { ...sharedValues, ...(rowValues[r.id] || {}) }
      const payload = JSON.stringify({ action: actionId, ...merged })
      return approveWorkflow(userId, r.id, payload)
    })
    const results = await Promise.allSettled(submits)
    const failures = []
    results.forEach((res, idx) => {
      const row = rows[idx]
      if (res.status === 'fulfilled') {
        onAfterApprove?.(res.value?.workflow, res.value?.status)
      } else {
        failures.push({ row, err: res.reason })
      }
    })
    if (failures.length) {
      setLaunchError(
        `${failures.length} of ${rows.length} failed — ${failures
          .map(f => candidateLabel(f.row))
          .join(', ')}.`,
      )
    }
    setLaunching(false)
  }, [launching, validateAll, rows, sharedValues, rowValues, actionId, userId, onAfterApprove, candidateLabel])

  const handleCancelAll = useCallback(async () => {
    if (cancelling || launching) return
    // eslint-disable-next-line no-alert
    const reason = window.prompt(
      `Cancel all ${rows.length} agents? Reason (required):`,
      'No longer required',
    )
    if (!reason || !reason.trim()) return
    setCancelling(true); setLaunchError(null)
    await Promise.allSettled(
      rows.map(r => cancelWorkflow(userId, r.id, reason.trim())),
    )
    setCancelling(false)
    onAfterCancel?.()
  }, [cancelling, launching, rows, userId, onAfterCancel])

  const setShared = (fid, v) => {
    setSharedValues(prev => ({ ...prev, [fid]: v }))
    if (errors[`shared:${fid}`]) setErrors(prev => ({ ...prev, [`shared:${fid}`]: undefined }))
  }
  const setRowField = (rid, fid, v) => {
    setRowValues(prev => ({ ...prev, [rid]: { ...(prev[rid] || {}), [fid]: v } }))
    if (errors[`${rid}:${fid}`]) setErrors(prev => ({ ...prev, [`${rid}:${fid}`]: undefined }))
  }

  return (
    <div className="space-y-4">
      {/* Same for everyone */}
      {shared.length > 0 && (
        <section className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            Same for everyone
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            Set once — applies to all {rows.length} candidate{rows.length === 1 ? '' : 's'}.
          </div>
          <div className="space-y-3">
            {shared.map(f => (
              <FieldRenderer
                key={f.id}
                field={f}
                value={sharedValues[f.id]}
                error={errors[`shared:${f.id}`]}
                onChange={v => setShared(f.id, v)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Personal details */}
      <section className="space-y-2">
        <div>
          <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            Personal details
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Different value per person.
          </div>
        </div>
        <div className="space-y-2">
          {rows.map(r => {
            const fields = perRowFields[r.id] || []
            return (
              <div
                key={r.id}
                className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden"
              >
                <div className="px-3 py-2 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                  <Avatar label={candidateLabel(r)} />
                  <div className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
                    {candidateLabel(r)}
                  </div>
                </div>
                {fields.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                    No per-person inputs.
                  </div>
                ) : (
                  <div className="px-3 py-3 space-y-3">
                    {fields.map(f => (
                      <FieldRenderer
                        key={f.id}
                        field={f}
                        value={rowValues[r.id]?.[f.id]}
                        error={errors[`${r.id}:${f.id}`]}
                        onChange={v => setRowField(r.id, f.id, v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {launchError ? (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
          {launchError}
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-100 dark:border-amber-900/40">
        <button
          onClick={handleCancelAll}
          disabled={launching || cancelling}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900 disabled:opacity-50 transition-colors"
        >
          {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          {cancelling ? 'Cancelling…' : (rows.length === 1 ? 'Cancel' : 'Cancel all')}
        </button>
        <button
          onClick={handleLaunchAll}
          disabled={launching || cancelling}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg text-white disabled:opacity-50 transition-colors',
            'bg-indigo-600 hover:bg-indigo-700',
          )}
        >
          {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {launching
            ? 'Launching…'
            : (rows.length === 1 ? 'Looks good — launch' : `Looks good — launch all ${rows.length}`)}
        </button>
      </div>
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
