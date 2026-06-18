import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, AlertCircle, RefreshCw, Check, GitBranch,
  Lock, Sparkles, ListOrdered,
} from 'lucide-react'
import { getWorkflowStages, saveWorkflow } from '../api/client'
import { cn } from '@/lib/utils'

const STAGE_LABELS = {
  1: 'Pre-onboarding',
  2: 'Onboarding',
  3: 'Post-onboarding',
}

export default function WorkflowDetail({
  userId, workflow, isActive, onBack, onActiveChange,
}) {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activating, setActivating] = useState(false)

  const load = async () => {
    if (!userId || !workflow?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await getWorkflowStages(userId, workflow.id)
      setStages(Array.isArray(res?.stages) ? res.stages : [])
    } catch (e) {
      setError(e.message || 'Failed to load workflow stages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, workflow?.id])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const s of stages) {
      const sid = s.stage_id || 0
      if (!map.has(sid)) map.set(sid, [])
      map.get(sid).push(s)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [stages])

  const setActive = async () => {
    if (!userId || !workflow?.id || activating || isActive) return
    setActivating(true)
    try {
      const saved = await saveWorkflow(userId, { id: workflow.id, name: workflow.name })
      onActiveChange?.({
        id: String(saved?.id || workflow.id),
        name: saved?.name || workflow.name,
      })
    } catch (e) {
      setError(e.message || 'Could not set active workflow')
    } finally {
      setActivating(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All workflows
        </button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-full text-xs font-medium text-indigo-600 dark:text-indigo-300 mb-3">
              <GitBranch className="w-3.5 h-3.5" />
              Workflow builder
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {workflow?.name || `Workflow ${workflow?.id}`}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Buckets are the ordered steps a candidate moves through. This is the live configuration pulled from Zimyo.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Refresh
            </button>
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                <Check className="w-3.5 h-3.5" />
                Active workflow
              </span>
            ) : workflow?.is_active === false ? (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                title="This workflow is disabled in Zimyo — re-enable it there before making it active."
              >
                Inactive — view only
              </span>
            ) : (
              <button
                onClick={setActive}
                disabled={activating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait"
              >
                {activating ? 'Setting…' : 'Set as active'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 animate-pulse">
                <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : stages.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-6 py-12 text-center">
            <ListOrdered className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No buckets configured</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This workflow has no activities defined yet in Zimyo.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([stageId, items], gi) => (
              <section key={stageId}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                    {STAGE_LABELS[stageId] || `Stage ${stageId}`}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    · {items.length} bucket{items.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((s, i) => {
                    const desc = s.raw?.ACTIVITY_DESC || s.raw?.activity_desc
                    const action = s.raw?.ACTION_NAME || s.raw?.action_name
                    const globalIdx = grouped.slice(0, gi).reduce((n, [, arr]) => n + arr.length, 0) + i + 1
                    return (
                      <div
                        key={`${s.id}-${i}`}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-600 transition"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300 flex items-center justify-center text-xs font-semibold shrink-0">
                          {globalIdx}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {s.name || action || `Bucket ${s.id}`}
                            </span>
                            {s.is_mandatory ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300">
                                <Lock className="w-2.5 h-2.5" />
                                Mandatory
                              </span>
                            ) : null}
                            {s.is_system === 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300">
                                <Sparkles className="w-2.5 h-2.5" />
                                Custom
                              </span>
                            ) : null}
                          </div>
                          {desc && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              {desc}
                            </p>
                          )}
                          {action && action !== s.name && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-mono truncate">
                              action · {action}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
