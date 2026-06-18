import { useEffect, useMemo, useRef, useState } from 'react'
import { Workflow as WorkflowIcon, RefreshCw, AlertCircle, Search, Layers } from 'lucide-react'
import { getWorkflow, getWorkflowOptions, getWorkflowStages } from '../api/client'
import { cn } from '@/lib/utils'
import WorkflowDetail from './WorkflowDetail'

function BucketCountChip({ count }) {
  if (count === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-400 dark:text-slate-500 animate-pulse">
        <Layers className="w-3 h-3" />
        … buckets
      </span>
    )
  }
  if (count === null) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
      <Layers className="w-3 h-3" />
      {count} bucket{count === 1 ? '' : 's'}
    </span>
  )
}

async function runWithConcurrency(items, limit, worker) {
  const queue = [...items]
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift()
      if (next === undefined) return
      await worker(next)
    }
  })
  await Promise.all(runners)
}

function formatDate(value) {
  if (!value) return null
  const d = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function WorkflowList({ userId, onActiveChange }) {
  const [workflows, setWorkflows] = useState([])
  const [activeId, setActiveId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [bucketCounts, setBucketCounts] = useState({})
  const countsAbortRef = useRef(0)

  const load = async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    setBucketCounts({})
    try {
      const [opts, current] = await Promise.all([
        getWorkflowOptions(userId).catch(() => ({ workflows: [] })),
        getWorkflow(userId).catch(() => ({ id: '', name: '' })),
      ])
      setWorkflows(opts?.workflows || [])
      setActiveId(String(current?.id || ''))
    } catch (e) {
      setError(e.message || 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId])

  // Bucket counts come from a per-workflow stages call — too expensive for
  // the backend to aggregate on load, so we fetch them progressively with a
  // small concurrency cap and patch each card as its count lands.
  useEffect(() => {
    if (!userId || workflows.length === 0) return
    const generation = ++countsAbortRef.current
    const targets = workflows
      .map((wf) => String(wf.id))
      .filter((id) => id && bucketCounts[id] === undefined)
    if (targets.length === 0) return
    runWithConcurrency(targets, 6, async (id) => {
      if (countsAbortRef.current !== generation) return
      try {
        const res = await getWorkflowStages(userId, id)
        const count = Array.isArray(res?.stages) ? res.stages.length : 0
        if (countsAbortRef.current !== generation) return
        setBucketCounts((prev) => ({ ...prev, [id]: count }))
      } catch {
        if (countsAbortRef.current !== generation) return
        setBucketCounts((prev) => ({ ...prev, [id]: null }))
      }
    })
    return () => { /* nothing — generation guard above handles stale writes */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflows, userId])

  const handleActivated = (wf) => {
    const newId = String(wf?.id || '')
    setActiveId(newId)
    onActiveChange?.(wf)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return workflows
    return workflows.filter((wf) =>
      String(wf.name || '').toLowerCase().includes(q) ||
      String(wf.id || '').toLowerCase().includes(q),
    )
  }, [workflows, query])

  if (selected) {
    return (
      <WorkflowDetail
        userId={userId}
        workflow={selected}
        isActive={String(selected.id) === activeId}
        onBack={() => setSelected(null)}
        onActiveChange={handleActivated}
      />
    )
  }

  const totalLabel = workflows.length === 1 ? '1 workflow' : `${workflows.length} workflows`

  return (
    <div className="h-full overflow-y-auto bg-slate-50/40 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h2 className="text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Workflows
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm max-w-3xl">
              A workflow is the journey a candidate takes — an ordered list of steps. Each one (CTC, BGV, Offer Letter, etc.) is called a bucket. Click a workflow to add, remove, or reorder its steps.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{totalLabel}</span>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {workflows.length > 6 && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows by name or ID…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500/50"
            />
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 animate-pulse">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="h-5 w-2/3 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
                <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded mb-6" />
                <div className="h-px bg-slate-100 dark:bg-slate-800 mb-3" />
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-6 py-12 text-center">
            <WorkflowIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No workflows configured</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ask your admin to set up at least one onboarding workflow in Zimyo.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No workflows match <span className="font-medium text-slate-700 dark:text-slate-200">&ldquo;{query}&rdquo;</span>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((wf) => {
              const isActive = String(wf.id) === activeId
              const isEnabled = wf.is_active !== false
              const updated = formatDate(wf.updated_on)
              const created = formatDate(wf.created_at)
              const candidates = typeof wf.total_candidates === 'number' ? wf.total_candidates : null
              return (
                <button
                  key={wf.id}
                  onClick={() => setSelected(wf)}
                  className={cn(
                    'group text-left rounded-2xl border bg-white dark:bg-slate-900 p-5 transition shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:-translate-y-0.5',
                    isActive
                      ? 'border-indigo-300 dark:border-indigo-500/50 ring-2 ring-indigo-100 dark:ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600',
                    !isEnabled && !isActive && 'opacity-75 hover:opacity-100',
                  )}
                >
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                      <WorkflowIcon className="w-4 h-4" />
                    </div>
                    <BucketCountChip count={bucketCounts[String(wf.id)]} />
                  </div>

                  <div className={cn(
                    'text-[17px] font-semibold leading-tight truncate',
                    isEnabled ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300',
                  )}>
                    {wf.name || `Workflow ${wf.id}`}
                  </div>
                  {wf.description ? (
                    <div className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {wf.description}
                    </div>
                  ) : null}

                  <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 truncate">
                      {candidates !== null
                        ? `${candidates} candidate${candidates === 1 ? '' : 's'}`
                        : 'Candidates —'}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 font-mono shrink-0">
                      {updated
                        ? `Updated ${updated}`
                        : created
                          ? `Created ${created}`
                          : ''}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
