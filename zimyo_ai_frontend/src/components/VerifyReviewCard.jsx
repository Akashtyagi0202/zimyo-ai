import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, X, Loader2, AlertCircle, FileText, Flag } from 'lucide-react'
import {
  getCandidateVerify,
  approveCandidateVerify,
  clarifyCandidateVerify,
} from '@/api/client'
import { cn } from '@/lib/utils'

// Verify Candidate Details review screen, rendered inside the approval card
// when the paused workflow's pause_kind === 'verify_candidate'. Mirrors the
// Zimyo verify screen: section nav + per-field values with "Mark error",
// the candidate's documents, and Approve / Clarify actions. The marked
// fields' `||` payload is assembled server-side — we send a clean list.
export default function VerifyReviewCard({
  candidateId,
  userId,
  onDone,        // (action) => void  — parent refreshes/removes the row
}) {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState(0)
  // marks: { [slug]: { slug, section, position, label, message, corrected_value } }
  const [marks, setMarks] = useState({})
  const [finalRemarks, setFinalRemarks] = useState('')
  const [submitting, setSubmitting] = useState(null)   // 'approve' | 'clarify' | null
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    let alive = true
    if (!userId || !candidateId) return
    setLoading(true); setError(null)
    getCandidateVerify(userId, candidateId)
      .then((res) => { if (alive) setPayload(res) })
      .catch((err) => { if (alive) setError(err?.message || 'Failed to load verify details') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [userId, candidateId])

  const sections = payload?.sections || []
  const documents = payload?.documents || []
  const candidate = payload?.candidate || {}
  const section = sections[activeSection] || null

  const markedList = useMemo(() => Object.values(marks), [marks])

  const toggleMark = useCallback((field, sec) => {
    setMarks((prev) => {
      const next = { ...prev }
      if (next[field.slug]) {
        delete next[field.slug]
      } else {
        next[field.slug] = {
          slug: field.slug,
          section: sec.slug,
          position: field.position,
          label: field.label,
          message: '',
          corrected_value: '',
        }
      }
      return next
    })
  }, [])

  const updateMark = useCallback((slug, key, value) => {
    setMarks((prev) => (
      prev[slug] ? { ...prev, [slug]: { ...prev[slug], [key]: value } } : prev
    ))
  }, [])

  const handleApprove = useCallback(async () => {
    if (submitting) return
    setSubmitting('approve'); setActionError(null)
    try {
      await approveCandidateVerify(userId, candidateId)
      onDone?.('approve')
    } catch (err) {
      setActionError(err?.message || 'Approve failed')
    } finally {
      setSubmitting(null)
    }
  }, [submitting, userId, candidateId, onDone])

  const handleClarify = useCallback(async () => {
    if (submitting) return
    if (!markedList.length) {
      setActionError('Mark at least one field as an error before sending a clarification.')
      return
    }
    setSubmitting('clarify'); setActionError(null)
    try {
      const markedFields = markedList.map((m) => ({
        slug: m.slug,
        section: m.section,
        position: m.position,
        message: m.message,
        corrected_value: m.corrected_value,
      }))
      await clarifyCandidateVerify(userId, candidateId, markedFields, finalRemarks)
      onDone?.('clarify')
    } catch (err) {
      setActionError(err?.message || 'Clarification send failed')
    } finally {
      setSubmitting(null)
    }
  }, [submitting, markedList, userId, candidateId, finalRemarks, onDone])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading candidate details…
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Candidate strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg">
        {[
          ['Candidate', candidate.name],
          ['Designation', candidate.designation],
          ['Email', candidate.email],
          ['CTC', candidate.ctc],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
            <div className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">{value ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
        {/* Section nav */}
        <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {sections.map((s, i) => {
            const sectionMarks = markedList.filter((m) => m.section === s.slug).length
            return (
              <button
                key={s.slug || i}
                onClick={() => setActiveSection(i)}
                className={cn(
                  'text-left px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-colors flex items-center justify-between gap-2',
                  i === activeSection
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                )}
              >
                <span className="truncate">{s.name || s.slug}</span>
                {sectionMarks > 0 ? (
                  <span className="text-[10px] px-1.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">
                    {sectionMarks}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Fields of the active section */}
        <div className="space-y-2">
          <div className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400">
            {section?.name || section?.slug || 'Details'}
          </div>
          {(section?.fields || []).length === 0 ? (
            <div className="text-[12px] text-slate-400 italic">No fields in this section.</div>
          ) : (
            (section?.fields || []).map((field) => {
              const marked = !!marks[field.slug]
              return (
                <div
                  key={field.slug}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    marked
                      ? 'border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/10'
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {field.label}{field.mandatory ? ' *' : ''}
                      </div>
                      <div className="text-[13px] font-medium text-slate-800 dark:text-slate-100 break-words">
                        {field.value === null || field.value === undefined || field.value === ''
                          ? '—' : String(field.value)}
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={marked}
                        onChange={() => toggleMark(field, section)}
                        className="accent-rose-500"
                      />
                      <Flag className="w-3 h-3" /> Mark error
                    </label>
                  </div>
                  {marked ? (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={marks[field.slug].message}
                        onChange={(e) => updateMark(field.slug, 'message', e.target.value)}
                        placeholder="What's wrong? (note to candidate)"
                        className="px-2 py-1 text-[12px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                      <input
                        value={marks[field.slug].corrected_value}
                        onChange={(e) => updateMark(field.slug, 'corrected_value', e.target.value)}
                        placeholder="Suggested value (optional)"
                        className="px-2 py-1 text-[12px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Documents */}
      {documents.length ? (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
            Candidate documents
          </div>
          <div className="flex flex-wrap gap-2">
            {documents.map((d, i) => (
              <div
                key={`${d.name}-${i}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[12px] text-slate-700 dark:text-slate-200"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[160px]">{d.name || d.file}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Final remarks (sent with a clarification) */}
      {markedList.length ? (
        <input
          value={finalRemarks}
          onChange={(e) => setFinalRemarks(e.target.value)}
          placeholder="Final remarks for the candidate (optional)"
          className="w-full px-3 py-2 text-[12px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
        />
      ) : null}

      {actionError ? (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {actionError}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={handleClarify}
          disabled={!!submitting || !markedList.length}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50 transition-colors"
        >
          {submitting === 'clarify' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
          Clarify{markedList.length ? ` (${markedList.length})` : ''}
        </button>
        <button
          onClick={handleApprove}
          disabled={!!submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
        >
          {submitting === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Approve
        </button>
      </div>
    </div>
  )
}
