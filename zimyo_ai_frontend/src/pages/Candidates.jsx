import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, ArrowRight, Loader2 } from 'lucide-react'
import { listCandidates } from '@/api/client'
import StatusBadge from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

// Status labels match the locked StatusBadge enum. "Withdrawn" covers BOTH
// our `cancelled` workflow state and Zimyo's pipeline withdrawn flag.
const STATUS_OPTIONS = [
  { value: '',                     label: 'All statuses'          },
  { value: 'running',              label: 'In progress'           },
  { value: 'waiting_on_candidate', label: 'Waiting on candidate'  },
  { value: 'awaiting_approval',    label: 'Needs your attention'  },
  { value: 'completed',            label: 'Done'                  },
  { value: 'withdrawn',            label: 'Withdrawn'             },
]

function Avatar({ initials }) {
  return (
    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
      <span className="text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300 tracking-wide">
        {initials}
      </span>
    </div>
  )
}

export default function Candidates({ user }) {
  const userId = user?.userId
  const navigate = useNavigate()
  const openCandidate = (row) =>
    navigate(`/candidates/${encodeURIComponent(row.id)}`, { state: { candidate: row } })
  const [search, setSearch] = useState('')
  // debouncedSearch is what we actually query against; updates 300ms after
  // the user stops typing. Avoids hammering Zimyo with every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [workflowId, setWorkflowId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [rows, setRows] = useState([])
  const [workflowOptions, setWorkflowOptions] = useState([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchPage = useCallback(async () => {
    if (!userId) return
    setLoading(true); setError(null)
    try {
      const res = await listCandidates(userId, {
        workflowId: workflowId || undefined,
        search:     debouncedSearch || undefined,
        status:     statusFilter || undefined,
      })
      setRows(res.rows ?? [])
      setWorkflowOptions(res.workflow_options ?? [])
      setSelectedWorkflowId(res.selected_workflow_id ?? null)
    } catch (err) {
      setError(err?.message || 'Failed to load candidates')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [userId, workflowId, debouncedSearch, statusFilter])

  useEffect(() => { fetchPage() }, [fetchPage])

  // When the dropdown shows the resolved workflow id (from admin_prefs),
  // sync the local select state once so the dropdown reflects it.
  useEffect(() => {
    if (!workflowId && selectedWorkflowId) setWorkflowId(selectedWorkflowId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflowId])

  const isEmpty = !loading && !error && rows.length === 0

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-500" />
          Candidates
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
          Everyone currently in flight. Filter by workflow or status — the agent state overrides Zimyo's pipeline status whenever a live workflow exists.
        </p>
      </header>

      {/* Filter row */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">Filter</div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 placeholder:text-slate-400"
            />
          </div>
          <select
            value={workflowId}
            onChange={e => setWorkflowId(e.target.value)}
            className="text-[13px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 min-w-[180px]"
          >
            <option value="">All workflows</option>
            {workflowOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name || `Workflow ${opt.id}`}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-[13px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 min-w-[180px]"
          >
            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {(search || workflowId || statusFilter) ? (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                // keep workflowId — admin's selected workflow scope is sticky.
              }}
              className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-3 px-4 py-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[13px] border border-rose-200 dark:border-rose-900">
          {error}
        </div>
      ) : null}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[40px,2.5fr,1.5fr,1.2fr,60px] gap-4 px-5 py-3 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
          <div></div>
          <div>Candidate</div>
          <div>Currently on</div>
          <div>Status</div>
          <div className="text-right">Open</div>
        </div>

        {loading && rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-[13px] text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            Loading candidates…
          </div>
        ) : isEmpty ? (
          <div className="px-6 py-12 text-center text-[13px] text-slate-500 dark:text-slate-400">
            {selectedWorkflowId
              ? 'No candidates in this workflow yet — try adjusting the filters.'
              : 'Pick a workflow to load candidates.'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(row => (
              <li
                key={row.id}
                onClick={() => openCandidate(row)}
                className="grid grid-cols-[40px,2.5fr,1.5fr,1.2fr,60px] gap-4 items-center px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
              >
                <input type="checkbox" className="accent-indigo-600" onClick={e => e.stopPropagation()} />
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={row.initials} />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100 truncate">
                      {row.name}
                    </div>
                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                      {[row.designation, row.email].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] text-slate-700 dark:text-slate-200 truncate">
                    {row.current_step || '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {row.workflow_template || ''}
                  </div>
                </div>
                <div>
                  <StatusBadge state={row.status} />
                </div>
                <div className="flex justify-end">
                  <button
                    aria-label={`Open ${row.name}`}
                    onClick={(e) => { e.stopPropagation(); openCandidate(row) }}
                    className={cn(
                      'w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700',
                      'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                      'hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
                      'flex items-center justify-center',
                    )}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer count */}
      {!loading && rows.length > 0 ? (
        <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 text-right">
          {rows.length} candidate{rows.length === 1 ? '' : 's'}
        </div>
      ) : null}
    </div>
  )
}
