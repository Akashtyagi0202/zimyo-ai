import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Plus, Inbox, Flag, Clock, Users, Bot, AlertTriangle,
  CheckCircle2, ArrowRight, RefreshCw, X, Loader2,
} from 'lucide-react'
import { listWorkflows, listCandidates, listActivity, getWorkflowInterrupt } from '@/api/client'
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
  return new Date(iso).toLocaleDateString()
}

function timeOf(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

function initialsOf(name) {
  if (!name) return '··'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const TERMINAL = new Set(['completed', 'cancelled', 'failed'])

// ─── stat card ───────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconTone, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4">
      <div className="flex items-center gap-2.5">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconTone)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
          {label}
        </div>
      </div>
      <div className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-2 leading-none">
        {value}
      </div>
      {sub ? (
        <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-1.5">{sub}</div>
      ) : null}
    </div>
  )
}

// ─── "what needs you" mini-card ──────────────────────────────────────

function NeedsCard({ icon: Icon, count, title, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left flex-1 min-w-[220px] rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-white dark:bg-slate-900 px-4 py-3.5 hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-[22px] font-semibold text-amber-600 dark:text-amber-400 leading-none">
            {count}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors" />
      </div>
      <div className="text-[13px] font-medium text-slate-900 dark:text-slate-100 mt-2.5">{title}</div>
      <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{sub}</div>
    </button>
  )
}

// ─── agent activity card (right rail) ────────────────────────────────

function AgentCard({ row, userId, onClick }) {
  const needsApproval = row.state === 'awaiting_approval'
  const waiting = row.state === 'waiting_on_candidate'
  const badge = needsApproval
    ? { text: 'Needs approval', dot: 'bg-amber-500', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' }
    : waiting
      ? { text: 'Waiting for response', dot: 'bg-amber-500', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' }
      : { text: 'Working', dot: 'bg-emerald-500', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' }

  const [details, setDetails] = useState(null)
  useEffect(() => {
    if (!userId || !row?.id) return
    let cancelled = false
    getWorkflowInterrupt(userId, row.id)
      .then(res => { if (!cancelled) setDetails(res) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId, row?.id])

  const candidateMeta = details?.metadata?.find(m => /^candidate/i.test(m.label))
  const who = candidateMeta?.value || (row.candidate_id ? `For ${row.candidate_id}` : row.workflow_type)
  const stepText = row.current_step || (details?.next_nodes || []).join(', ')
  const reasoning = details?.reasoning
  const plan = details?.proposed_plan || []
  const done = plan.filter(s => s.status === 'done').length

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl border overflow-hidden transition-all hover:shadow-sm',
        needsApproval || waiting
          ? 'border-amber-200/70 dark:border-amber-900/40 bg-white dark:bg-slate-900'
          : 'border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/10',
      )}
    >
      <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">
              {who?.startsWith('For ') ? who : `For ${who}`}
            </span>
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0', badge.cls)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
              {badge.text}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {row.workflow_type}{row.started_at ? ` · started ${relativeFrom(row.started_at)}` : ''}
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
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <div className="text-[11.5px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed line-clamp-3 flex-1">
            {reasoning}
          </div>
        </div>
      ) : null}

      <div className="mx-4 mb-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3 h-3" /> 1 candidate
        </span>
        {plan.length > 0 ? <span>{done} of {plan.length} steps done</span> : null}
      </div>
    </button>
  )
}

// ─── pipeline group (one workflow template) ──────────────────────────

function PipelineGroup({ name, steps, total }) {
  const max = Math.max(1, ...steps.map(s => s.count))
  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{name}</h3>
        <span className="text-[12px] text-slate-400 dark:text-slate-500">
          {total} candidate{total === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex items-end gap-2 h-32 border-b border-slate-100 dark:border-slate-800">
        {steps.map(s => (
          <div key={s.step} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full group" title={`${s.count} candidate${s.count === 1 ? '' : 's'} in ${s.step}`}>
            {s.count > 0 ? (
              <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{s.count}</span>
            ) : null}
            <div
              className={cn(
                'w-full rounded-t-md transition-all',
                s.count > 0
                  ? 'bg-gradient-to-b from-violet-500 to-indigo-500 group-hover:from-violet-400'
                  : 'bg-transparent',
              )}
              style={{ height: s.count > 0 ? `${Math.max(8, (s.count / max) * 100)}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {steps.map(s => (
          <div key={s.step} className="flex-1 min-w-0 text-center text-[10.5px] text-slate-400 dark:text-slate-500 truncate" title={s.step}>
            {s.step}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── main ────────────────────────────────────────────────────────────

export default function Dashboard({ user }) {
  const userId = user?.userId
  const navigate = useNavigate()

  const [workflows, setWorkflows] = useState([])
  const [candidates, setCandidates] = useState([])
  const [candidateTotal, setCandidateTotal] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem('zimyo_dash_welcome_dismissed') !== '1',
  )

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true); setError(null)
    const [wfRes, candRes, actRes] = await Promise.allSettled([
      listWorkflows(userId, { includeRecentlyCompleted: true, completedWithinDays: 7, limit: 200 }),
      listCandidates(userId, { page: 1 }),
      listActivity(userId, { limit: 8 }),
    ])
    if (wfRes.status === 'fulfilled') setWorkflows(wfRes.value?.rows ?? [])
    if (candRes.status === 'fulfilled') {
      setCandidates(candRes.value?.rows ?? [])
      setCandidateTotal(candRes.value?.pagination?.total ?? candRes.value?.rows?.length ?? null)
    }
    if (actRes.status === 'fulfilled') setActivity(actRes.value?.rows ?? [])
    if (wfRes.status === 'rejected' && candRes.status === 'rejected') {
      setError(wfRes.reason?.message || 'Failed to load dashboard')
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetchAll()
    const id = setInterval(fetchAll, 15_000)
    return () => clearInterval(id)
  }, [userId, fetchAll])

  // ── derived metrics (all from real rows) ──
  const m = useMemo(() => {
    const needApproval = workflows.filter(r => r.state === 'awaiting_approval').length
    const waiting = workflows.filter(r => r.state === 'waiting_on_candidate').length
    const failed = workflows.filter(r => r.state === 'failed').length
    const running = workflows.filter(r => r.state === 'running').length
    const atWork = running + needApproval
    const onboarded = workflows.filter(r => r.state === 'completed').length
    const totalCandidates = candidateTotal ?? candidates.length
    return { needApproval, waiting, failed, running, atWork, onboarded, totalCandidates }
  }, [workflows, candidateTotal, candidates.length])

  // Live agent cards — non-terminal workflows, approval/waiting first.
  const liveAgents = useMemo(() => {
    const order = { awaiting_approval: 0, running: 1, waiting_on_candidate: 2 }
    return workflows
      .filter(r => !TERMINAL.has(r.state))
      .sort((a, b) => (order[a.state] ?? 9) - (order[b.state] ?? 9))
  }, [workflows])

  // Pipeline distribution — group candidates by template, count by step.
  const pipeline = useMemo(() => {
    const groups = new Map() // template -> { stepOrder:[], counts:Map, total }
    for (const c of candidates) {
      const tmpl = c.workflow_template || 'Default'
      const step = c.current_step || 'Unassigned'
      if (!groups.has(tmpl)) groups.set(tmpl, { stepOrder: [], counts: new Map(), total: 0 })
      const g = groups.get(tmpl)
      if (!g.counts.has(step)) { g.counts.set(step, 0); g.stepOrder.push(step) }
      g.counts.set(step, g.counts.get(step) + 1)
      g.total += 1
    }
    return Array.from(groups.entries()).map(([name, g]) => ({
      name,
      total: g.total,
      steps: g.stepOrder.map(step => ({ step, count: g.counts.get(step) })),
    }))
  }, [candidates])

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8">
      {/* Header */}
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Dashboard
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
            A live view across all your candidate journeys — what needs you right now, what your
            agents are doing, and where everyone is in the pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline" size="sm"
            onClick={() => navigate('/chat/onboarding')}
            className="h-9 px-3.5 text-[13px] gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> Launch an agent
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/chat/onboarding')}
            className="h-9 px-3.5 text-[13px] gap-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> New workflow
          </Button>
        </div>
      </header>

      {error ? (
        <div className="mb-5 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[13px] border border-rose-200 dark:border-rose-900 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAll} className="inline-flex items-center gap-1 text-[12px] underline">
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} /> Retry
          </button>
        </div>
      ) : null}

      {/* Welcome banner */}
      {showWelcome ? (
        <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              Welcome — let the assistant do the heavy lifting.
            </div>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Ask in natural language. Try <b>"onboard Akash"</b>, <b>"summarize Neil"</b>, or{' '}
              <b>"what's stuck"</b>. The assistant knows which page you're on and acts on context.
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/chat/onboarding')}
              className="mt-3 h-8 px-3.5 text-[12.5px] gap-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:opacity-90"
            >
              <Sparkles className="w-3.5 h-3.5" /> Open the assistant
            </Button>
          </div>
          <button
            onClick={() => { setShowWelcome(false); localStorage.setItem('zimyo_dash_welcome_dismissed', '1') }}
            aria-label="Dismiss"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {/* What needs you right now */}
      {(m.needApproval + m.waiting + m.failed) > 0 ? (
        <div className="mb-6 rounded-2xl border-2 border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/10 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                What needs you right now
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                Tackle them top-down, or ask the assistant ("what's stuck") to walk through them.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {m.needApproval > 0 ? (
              <NeedsCard
                icon={Inbox} count={m.needApproval}
                title="Plans waiting for your approval"
                sub="Review the plan, fill in inputs, approve."
                onClick={() => navigate('/approvals')}
              />
            ) : null}
            {m.waiting > 0 ? (
              <NeedsCard
                icon={Clock} count={m.waiting}
                title="Waiting on a candidate response"
                sub="Joining forms, offer responses, BGV checks."
                onClick={() => navigate('/candidates')}
              />
            ) : null}
            {m.failed > 0 ? (
              <NeedsCard
                icon={Flag} count={m.failed}
                title="Agents that hit an error"
                sub="A step failed — review and re-run or cancel."
                onClick={() => navigate('/mission-control')}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users} iconTone="bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400"
          label="Total candidates" value={m.totalCandidates ?? '—'} sub="across all workflows"
        />
        <StatCard
          icon={Bot} iconTone="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
          label="Agents at work" value={m.atWork}
          sub={m.needApproval > 0 ? `${m.needApproval} need your approval` : 'running now'}
        />
        <StatCard
          icon={AlertTriangle} iconTone="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
          label="Stuck" value={m.waiting + m.failed}
          sub={`${m.waiting} waiting · ${m.failed} flagged`}
        />
        <StatCard
          icon={CheckCircle2} iconTone="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
          label="Onboarded" value={m.onboarded} sub="completed in last 7 days"
        />
      </div>

      {/* Pipeline + agents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Pipeline */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">Pipeline at a glance</h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">
              How candidates are distributed across each workflow's steps.
            </p>
          </div>
          {pipeline.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-slate-400 dark:text-slate-500">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading pipeline…</>
              ) : 'No candidates in any workflow yet.'}
            </div>
          ) : (
            pipeline.map(g => (
              <PipelineGroup key={g.name} name={g.name} steps={g.steps} total={g.total} />
            ))
          )}
        </div>

        {/* Agents */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
              What your agents are doing
            </h2>
            <button
              onClick={() => navigate('/mission-control')}
              className="text-[12px] text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
            >
              All agents <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {liveAgents.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-slate-400 dark:text-slate-500">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading agents…</>
              ) : 'No agents running right now.'}
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[640px] pr-1">
              {liveAgents.map(row => (
                <AgentCard
                  key={row.id} row={row} userId={userId}
                  onClick={() => navigate('/mission-control')}
                />
              ))}
            </div>
          )}
          {m.needApproval > 0 ? (
            <button
              onClick={() => navigate('/approvals')}
              className="mt-3 text-[12px] text-amber-700 dark:text-amber-400 inline-flex items-center gap-1.5 hover:underline"
            >
              <Inbox className="w-3.5 h-3.5" />
              {m.needApproval} agent{m.needApproval === 1 ? '' : 's'} need your approval
            </button>
          ) : null}
        </div>
      </div>

      {/* What just happened */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">What just happened</h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">Latest events across all candidates.</p>
          </div>
          <button
            onClick={() => navigate('/activity')}
            className="text-[12px] text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
          >
            Full log <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {activity.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-slate-400 dark:text-slate-500">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</>
            ) : 'Nothing logged yet.'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {activity.map(ev => {
              const who = ev.actor_label || ev.candidate_id || ev.actor_type || 'System'
              return (
                <li key={ev.id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 uppercase">
                      {initialsOf(who)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{who}</span>
                    <span className="text-[13px] text-slate-500 dark:text-slate-400">
                      {' — '}{ev.message || ev.event_type}
                    </span>
                  </div>
                  <span className="text-[12px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                    {timeOf(ev.occurred_at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
