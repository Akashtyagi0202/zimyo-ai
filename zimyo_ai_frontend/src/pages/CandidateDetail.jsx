import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronLeft, Briefcase, Mail, Phone, Layers, ArrowRight, Sparkles,
  Ban, Loader2, Check, X,
} from 'lucide-react'
import {
  listCandidates, getWorkflowStages, listActivityForCandidate,
  getCandidateVerify, cancelWorkflow, sendMessageStream,
} from '@/api/client'
import StatusBadge from '@/components/StatusBadge'
import LaunchAgentModal from '@/components/LaunchAgentModal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── helpers ─────────────────────────────────────────────────────────

function relativeFrom(iso) {
  if (!iso) return ''
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
  const mo = Math.floor(d / 30)
  if (mo < 12) return `about ${mo} month${mo === 1 ? '' : 's'} ago`
  return `${Math.floor(mo / 12)}y ago`
}

const norm = (s) => (s || '').trim().toLowerCase()

// ─── step timeline ───────────────────────────────────────────────────

function StepTimeline({ stages, currentIndex }) {
  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex items-start w-max">
        {stages.map((stage, i) => {
          const done = currentIndex >= 0 && i < currentIndex
          const current = i === currentIndex
          const statusLabel = current ? 'Current step' : done ? 'Done' : 'Not started'
          return (
            <div key={stage.id ?? i} className="flex items-start">
              <div className="flex flex-col items-center text-center w-[92px] shrink-0">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ring-1',
                    current
                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white ring-violet-400/40 shadow-sm shadow-violet-500/30'
                      : done
                        ? 'bg-emerald-500 text-white ring-emerald-400/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-slate-200 dark:ring-slate-700',
                  )}
                >
                  {done ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <div
                  className={cn(
                    'text-[11px] font-medium mt-2 leading-tight line-clamp-2',
                    current ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300',
                  )}
                  title={stage.name}
                >
                  {stage.name}
                </div>
                <div className={cn(
                  'text-[10.5px] mt-0.5 leading-tight',
                  current ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500',
                )}>
                  {statusLabel}
                </div>
              </div>
              {i < stages.length - 1 ? (
                <div className={cn(
                  'h-px w-6 mt-[18px] shrink-0',
                  done ? 'bg-emerald-400/60' : 'bg-slate-200 dark:bg-slate-700',
                )} />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── withdraw modal ──────────────────────────────────────────────────

function WithdrawModal({ candidate, busy, error, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()
  return (
    <div className="fixed inset-0 z-30 bg-slate-900/40 dark:bg-slate-950/60 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Withdraw candidate</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{candidate?.name}</div>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close"
            className="p-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="text-[12px] text-slate-700 dark:text-slate-300">Reason (required)</span>
            <textarea
              autoFocus rows={3} value={reason} disabled={busy}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Candidate dropped, role no longer required…"
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            This cancels the candidate's live workflow. The reason is stored in the audit trail.
          </p>
          {error ? (
            <div className="px-3 py-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[12px] border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          ) : null}
        </div>
        <footer className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy} className="text-[12px] h-8 px-3">
            Keep candidate
          </Button>
          <Button size="sm" disabled={trimmed.length < 1 || busy}
            onClick={() => onConfirm(trimmed)}
            className="text-[12px] h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white">
            {busy ? 'Withdrawing…' : 'Withdraw candidate'}
          </Button>
        </footer>
      </div>
    </div>
  )
}

// ─── main ────────────────────────────────────────────────────────────

export default function CandidateDetail({ user }) {
  const userId = user?.userId
  const { candidateId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Instant render from the row the list handed us; refetched below for freshness.
  const [candidate, setCandidate] = useState(location.state?.candidate ?? null)
  const [stages, setStages] = useState([])
  const [activity, setActivity] = useState([])
  const [collected, setCollected] = useState(null)   // null = not loaded, [] = none
  const [collectedLoading, setCollectedLoading] = useState(false)
  const [tab, setTab] = useState('activity')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawBusy, setWithdrawBusy] = useState(false)
  const [withdrawError, setWithdrawError] = useState(null)

  const [launchOpen, setLaunchOpen] = useState(false)
  const [launchBusy, setLaunchBusy] = useState(false)
  const [launchError, setLaunchError] = useState(null)

  // Spawn = fire the scope's natural-language command through the chat
  // supervisor (the only spawn entry — no parallel agent stack). The intent
  // router classifies it into the right onboarding graph (full_onboard /
  // auto_progress) and the first turn pauses at an approval interrupt, which
  // persists a workflow row. We drain the stream in the background (don't
  // render it), then drop the admin into Mission Control where the new agent
  // sits as "Needs approval". Approve once → runs to completion.
  const handleSpawn = useCallback(async (scope, message) => {
    if (!userId || launchBusy) return
    setLaunchBusy(true); setLaunchError(null)
    let streamErr = null
    try {
      await sendMessageStream(
        { userId, message },
        {
          onError: (e) => { streamErr = e?.message || 'The agent could not be launched.' },
          onFinal: () => {},
        },
      )
      if (streamErr) throw new Error(streamErr)
      setLaunchBusy(false)
      setLaunchOpen(false)
      navigate('/mission-control')
    } catch (err) {
      setLaunchBusy(false)
      setLaunchError(err?.message || 'The agent could not be launched.')
    }
  }, [userId, launchBusy, navigate])

  // Resolve the candidate row (when arrived via deep link) + activity.
  const loadCore = useCallback(async () => {
    if (!userId) return
    setLoading(true); setError(null)
    const [candRes, actRes] = await Promise.allSettled([
      candidate ? Promise.resolve(null) : listCandidates(userId, { page: 1 }),
      listActivityForCandidate(userId, candidateId, { limit: 100 }),
    ])
    if (candRes.status === 'fulfilled' && candRes.value) {
      const found = (candRes.value.rows ?? []).find(r => String(r.id) === String(candidateId))
      if (found) setCandidate(found)
      else setError('Candidate not found in the current roster.')
    }
    if (actRes.status === 'fulfilled') setActivity(actRes.value?.rows ?? [])
    setLoading(false)
  }, [userId, candidateId, candidate])

  useEffect(() => { loadCore() }, [loadCore])

  // Workflow step sequence — needs the candidate's workflow_id.
  useEffect(() => {
    const wfId = candidate?.workflow_id
    if (!userId || !wfId) return
    let cancelled = false
    getWorkflowStages(userId, wfId)
      .then(res => { if (!cancelled) setStages(res?.stages ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId, candidate?.workflow_id])

  // Lazy-load collected data when the tab is first opened.
  useEffect(() => {
    if (tab !== 'collected' || collected !== null || !userId) return
    setCollectedLoading(true)
    getCandidateVerify(userId, candidateId)
      .then(res => setCollected(res?.sections ?? []))
      .catch(() => setCollected([]))
      .finally(() => setCollectedLoading(false))
  }, [tab, collected, userId, candidateId])

  const currentIndex = useMemo(() => {
    if (!stages.length) return -1
    const cur = norm(candidate?.current_step) || norm(candidate?.active_workflow?.current_step)
    if (!cur) return -1
    return stages.findIndex(s => norm(s.name) === cur)
  }, [stages, candidate?.current_step, candidate?.active_workflow?.current_step])

  const activeWf = candidate?.active_workflow
  const canWithdraw = activeWf?.id &&
    !['completed', 'cancelled', 'failed'].includes(activeWf.state)

  const handleWithdraw = useCallback(async (reason) => {
    if (!userId || !activeWf?.id) return
    setWithdrawBusy(true); setWithdrawError(null)
    try {
      await cancelWorkflow(userId, activeWf.id, reason)
      setWithdrawOpen(false)
      await loadCore()
    } catch (err) {
      setWithdrawError(err?.message || 'Withdraw failed')
    } finally {
      setWithdrawBusy(false)
    }
  }, [userId, activeWf?.id, loadCore])

  const contact = [
    candidate?.designation && { icon: Briefcase, text: candidate.designation },
    candidate?.email && { icon: Mail, text: candidate.email },
    candidate?.phone && { icon: Phone, text: candidate.phone },
  ].filter(Boolean)

  if (!candidate && loading) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-16 text-center text-[13px] text-slate-500 dark:text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading candidate…
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      {/* Back */}
      <button
        onClick={() => navigate('/candidates')}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> All candidates
      </button>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {candidate?.name || candidateId}
        </h1>
        {candidate?.designation ? (
          <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-0.5">{candidate.designation}</p>
        ) : null}
      </div>

      {error ? (
        <div className="mb-5 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[13px] border border-rose-200 dark:border-rose-900">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile + step card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
                <span className="text-[18px] font-semibold text-white">{candidate?.initials || 'NV'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-2">
                  {candidate?.status ? <StatusBadge state={candidate.status} /> : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-slate-600 dark:text-slate-300">
                  {contact.map((c, i) => {
                    const Icon = c.icon
                    return (
                      <span key={i} className="inline-flex items-center gap-1.5 min-w-0">
                        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.text}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Current step banner */}
            <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                  Current step
                </div>
                <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  {candidate?.current_step || '—'}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setLaunchOpen(true)}
                className="h-9 px-3.5 text-[13px] gap-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:opacity-90"
              >
                Open this step <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Timeline */}
            {stages.length > 0 ? (
              <div className="mt-5">
                <StepTimeline stages={stages} currentIndex={currentIndex} />
              </div>
            ) : candidate?.workflow_id ? (
              <div className="mt-5 text-[12px] text-slate-400 dark:text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" /> Loading workflow steps…
              </div>
            ) : null}
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-6 px-6 pt-4 border-b border-slate-100 dark:border-slate-800">
              {[['activity', 'Activity'], ['collected', 'Collected data']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'pb-3 text-[13.5px] font-medium border-b-2 -mb-px transition-colors',
                    tab === key
                      ? 'border-violet-500 text-slate-900 dark:text-slate-100'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="px-6 py-5">
              {tab === 'activity' ? (
                activity.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-slate-400 dark:text-slate-500">
                    {loading ? 'Loading…' : 'No activity recorded yet.'}
                  </div>
                ) : (
                  <ul className="space-y-0">
                    {activity.map((ev, i) => (
                      <li key={ev.id ?? i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                            <ArrowRight className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          {i < activity.length - 1 ? (
                            <div className="w-px flex-1 bg-slate-200 dark:bg-slate-800 my-1" />
                          ) : null}
                        </div>
                        <div className="pb-5 min-w-0">
                          <div className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100">
                            {ev.message || ev.event_type}
                          </div>
                          <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {(ev.actor_label || ev.actor_type || 'system')} · {relativeFrom(ev.occurred_at)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                collectedLoading ? (
                  <div className="py-8 text-center text-[13px] text-slate-400 dark:text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading collected data…
                  </div>
                ) : !collected || collected.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-slate-400 dark:text-slate-500">
                    No collected data yet — it appears once the candidate submits their details.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {collected.map((section, si) => (
                      <div key={si}>
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-2">
                          {section.name}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(section.fields ?? []).map((f, fi) => (
                            <div key={fi} className="min-w-0">
                              <div className="text-[11px] text-slate-400 dark:text-slate-500">{f.label}</div>
                              <div className="text-[13px] text-slate-700 dark:text-slate-200 truncate">
                                {f.value || '—'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Actions rail */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 lg:sticky lg:top-20">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Actions</h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              Run an agent, advance manually, or withdraw.
            </p>
            <div className="space-y-2.5">
              <Button
                onClick={() => setLaunchOpen(true)}
                className="w-full h-10 text-[13.5px] gap-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:opacity-90"
              >
                <Sparkles className="w-4 h-4" /> Launch an agent
              </Button>
              <Button
                variant="outline"
                onClick={() => setLaunchOpen(true)}
                className="w-full h-10 text-[13.5px]"
              >
                Open current step
              </Button>
              <Button
                variant="outline"
                disabled={!canWithdraw}
                onClick={() => { setWithdrawError(null); setWithdrawOpen(true) }}
                className="w-full h-10 text-[13.5px] gap-1.5 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
                title={canWithdraw ? undefined : 'No active workflow to withdraw'}
              >
                <Ban className="w-4 h-4" /> Withdraw candidate
              </Button>
            </div>
          </div>
        </div>
      </div>

      {launchOpen ? (
        <LaunchAgentModal
          candidate={candidate}
          busy={launchBusy}
          error={launchError}
          onSpawn={handleSpawn}
          onClose={() => { if (!launchBusy) { setLaunchOpen(false); setLaunchError(null) } }}
        />
      ) : null}

      {withdrawOpen ? (
        <WithdrawModal
          candidate={candidate}
          busy={withdrawBusy}
          error={withdrawError}
          onConfirm={handleWithdraw}
          onClose={() => { if (!withdrawBusy) setWithdrawOpen(false) }}
        />
      ) : null}
    </div>
  )
}
