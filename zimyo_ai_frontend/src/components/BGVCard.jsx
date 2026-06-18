import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Loader2, AlertCircle, ShieldCheck, Upload } from 'lucide-react'
import { getBgvForm, bgvSignedUrl, submitBgv } from '@/api/client'
import { cn } from '@/lib/utils'

// Background Verification screen (Zimyo CURRENT_STEP = 7), rendered inside the
// approval card when the paused workflow's pause_kind === 'background_verification'.
// Multi-section form (Criminal / Address / Work / Qualification / Reference /
// Common). Some fields are file uploads → signed-url + S3 PUT, then the object
// basename goes into the field. On submit, sections are assembled into Zimyo's
// sectioned sendBgvData payload. Unlike Convert, submit does NOT advance — the
// candidate then waits for the external verification vendor.

const SELECT_TYPES = new Set(['select', 'autocomplete', 'changeable', 'onchangetype'])

function fieldInputType(type) {
  switch (type) {
    case 'calander': return 'date'
    case 'number':   return 'number'
    case 'email':    return 'email'
    default:         return 'text'
  }
}

export default function BGVCard({
  candidateId,
  userId,
  onDone,        // () => void — parent refreshes/removes the row
}) {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(0)
  const [values, setValues] = useState({})        // { [slug]: value }
  const [uploading, setUploading] = useState({})   // { [slug]: bool }
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    let alive = true
    if (!userId || !candidateId) return
    setLoading(true); setError(null)
    getBgvForm(userId, candidateId)
      .then((res) => {
        if (!alive) return
        setForm(res)
        const seed = {}
        for (const sec of res?.sections || []) {
          for (const f of sec.fields || []) seed[f.slug] = ''
        }
        setValues(seed)
      })
      .catch((err) => { if (alive) setError(err?.message || 'Failed to load BGV form') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [userId, candidateId])

  const sections = form?.sections || []
  const orgId = form?.org_id
  const section = sections[step] || null

  const setValue = useCallback((slug, v) => {
    setValues((prev) => ({ ...prev, [slug]: v }))
  }, [])

  const handleUpload = useCallback(async (slug, file) => {
    if (!file) return
    setActionError(null)
    setUploading((p) => ({ ...p, [slug]: true }))
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
      const rand = Math.random().toString(36).slice(2)
      const prefix = orgId ? `${orgId}/` : ''
      const key = `${prefix}candidates/documents/${Date.now()}_${rand}.${ext}`
      const signed = await bgvSignedUrl(userId, candidateId, {
        key, contentType: file.type || 'application/octet-stream', fileSize: file.size,
      })
      const url = signed?.data?.signed_url || signed?.signed_url
      if (!url) throw new Error('No signed URL returned')
      const put = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!put.ok) throw new Error(`Upload failed (${put.status})`)
      // Zimyo stores the object basename in the field.
      setValue(slug, key.split('/').pop())
    } catch (err) {
      setActionError(err?.message || 'File upload failed')
    } finally {
      setUploading((p) => ({ ...p, [slug]: false }))
    }
  }, [orgId, userId, candidateId, setValue])

  const missingInSection = useCallback((sec) => (
    (sec?.fields || []).filter((f) => f.mandatory && !String(values[f.slug] ?? '').trim())
  ), [values])

  const sectionMissingCounts = useMemo(
    () => sections.map((s) => missingInSection(s).length),
    [sections, missingInSection],
  )
  const totalMissing = useMemo(
    () => sectionMissingCounts.reduce((a, b) => a + b, 0),
    [sectionMissingCounts],
  )
  const anyUploading = useMemo(() => Object.values(uploading).some(Boolean), [uploading])
  const isLast = step === sections.length - 1

  const goNext = useCallback(() => {
    setTouched(true)
    if (missingInSection(section).length > 0) return
    setTouched(false)
    setStep((s) => Math.min(s + 1, sections.length - 1))
  }, [section, missingInSection, sections.length])

  const goPrev = useCallback(() => {
    setTouched(false)
    setStep((s) => Math.max(s - 1, 0))
  }, [])

  const handleSubmit = useCallback(async () => {
    setTouched(true)
    if (totalMissing > 0) {
      const idx = sectionMissingCounts.findIndex((c) => c > 0)
      if (idx >= 0) setStep(idx)
      setActionError('Fill all mandatory fields before submitting.')
      return
    }
    if (submitting || anyUploading) return
    setSubmitting(true); setActionError(null)
    try {
      // Assemble Zimyo's sectioned sendBgvData payload.
      const payload = {}
      for (const sec of sections) {
        const secData = {}
        for (const f of sec.fields || []) {
          secData[f.slug] = values[f.slug] === '' ? null : values[f.slug]
        }
        payload[sec.slug] = secData
      }
      payload.CID = String(candidateId)
      payload.CHECKED_SECTION_SLUGS = sections.map((s) => s.slug).filter(Boolean)
      await submitBgv(userId, candidateId, payload)
      onDone?.()
    } catch (err) {
      setActionError(err?.message || 'BGV submit failed')
    } finally {
      setSubmitting(false)
    }
  }, [totalMissing, sectionMissingCounts, submitting, anyUploading, sections, values, candidateId, userId, onDone])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading BGV form…
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
      {/* Stepper */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {sections.map((s, i) => {
          const done = i < step
          const active = i === step
          const missing = sectionMissingCounts[i] > 0
          return (
            <div key={s.slug || i} className="flex items-center shrink-0">
              <button onClick={() => { setTouched(false); setStep(i) }} className="flex items-center gap-2 group" title={s.name}>
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors',
                  active ? 'bg-indigo-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
                )}>
                  {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className={cn(
                  'text-[11px] whitespace-nowrap pr-1',
                  active ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-500 dark:text-slate-400',
                )}>
                  {s.name}{missing ? <span className="ml-1 text-rose-500">*</span> : null}
                </span>
              </button>
              {i < sections.length - 1 ? <div className="w-6 h-px bg-slate-200 dark:bg-slate-700 mx-1" /> : null}
            </div>
          )
        })}
      </div>

      {/* Active section fields */}
      <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-3">
          {section?.name || 'Details'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(section?.fields || []).map((field) => {
            const val = values[field.slug] ?? ''
            const showError = touched && field.mandatory && !String(val).trim()
            const baseInputCls = cn(
              'w-full px-3 py-2 text-[13px] rounded-lg border bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100',
              showError ? 'border-rose-300 dark:border-rose-800' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-400',
            )

            let control
            if (SELECT_TYPES.has(field.type)) {
              control = (
                <select value={val} onChange={(e) => setValue(field.slug, e.target.value)} className={baseInputCls}>
                  <option value="">Select…</option>
                  {(field.options || []).map((o, i) => {
                    const id = typeof o === 'object' ? o.id : o
                    const name = typeof o === 'object' ? o.name : o
                    return <option key={id ?? i} value={id}>{name}</option>
                  })}
                </select>
              )
            } else if (field.type === 'file') {
              control = (
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {uploading[field.slug] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Choose file
                    <input type="file" className="hidden" disabled={uploading[field.slug]}
                      onChange={(e) => handleUpload(field.slug, e.target.files?.[0])} />
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                    {uploading[field.slug] ? 'Uploading…' : (val || 'No file chosen')}
                  </span>
                </div>
              )
            } else {
              control = (
                <input
                  type={fieldInputType(field.type)}
                  value={val}
                  maxLength={field.max_length || undefined}
                  onChange={(e) => setValue(field.slug, e.target.value)}
                  className={baseInputCls}
                />
              )
            }

            return (
              <div key={field.slug}>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">
                  {field.label}{field.mandatory ? <span className="text-rose-500"> *</span> : null}
                </label>
                {control}
                {showError ? <div className="text-[10px] text-rose-500 mt-1">This field is required.</div> : null}
              </div>
            )
          })}
          {(section?.fields || []).length === 0 ? (
            <div className="text-[12px] text-slate-400 italic">No fields in this section.</div>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {actionError}
        </div>
      ) : null}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-slate-400 dark:text-slate-500">
          Step {step + 1} of {sections.length}
          {totalMissing > 0 ? ` · ${totalMissing} required field${totalMissing > 1 ? 's' : ''} left` : ''}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} disabled={step === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          {isLast ? (
            <button onClick={handleSubmit} disabled={submitting || anyUploading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Submit BGV
            </button>
          ) : (
            <button onClick={goNext}
              className="inline-flex items-center gap-1 px-4 py-1.5 text-[12px] font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
