import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, Filter, X } from 'lucide-react'
import { listActivity } from '@/api/client'
import { cn } from '@/lib/utils'

const ACTOR_FILTERS = [
  { value: '',          label: 'All actors' },
  { value: 'admin',     label: 'Admin'      },
  { value: 'agent',     label: 'Agent'      },
  { value: 'candidate', label: 'Candidate'  },
  { value: 'system',    label: 'System'     },
]

const EVENT_FILTERS = [
  { value: '',                    label: 'All events' },
  { value: 'workflow_started',    label: 'Workflow started'   },
  { value: 'workflow_completed',  label: 'Workflow completed' },
  { value: 'workflow_cancelled',  label: 'Workflow cancelled' },
  { value: 'plan_drafted',        label: 'Plan drafted'       },
  { value: 'plan_approved',       label: 'Plan approved'      },
  { value: 'plan_rejected',       label: 'Plan rejected'      },
  { value: 'step_started',        label: 'Step started'       },
  { value: 'step_completed',      label: 'Step completed'     },
  { value: 'step_failed',         label: 'Step failed'        },
  { value: 'interrupt_raised',    label: 'Interrupt raised'   },
  { value: 'resumed',             label: 'Resumed'            },
  { value: 'form_sent',           label: 'Form sent'          },
  { value: 'form_submitted',      label: 'Form submitted'     },
  { value: 'offer_accepted',      label: 'Offer accepted'     },
  { value: 'offer_rejected',      label: 'Offer rejected'     },
  { value: 'memory_edited',       label: 'Memory edited'      },
]

const ACTOR_PILL_CLS = {
  admin:     'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  agent:     'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  candidate: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  system:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

function formatTs(iso) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: '2-digit', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function ActorPill({ type, label }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
        ACTOR_PILL_CLS[type] ?? ACTOR_PILL_CLS.system,
      )}
    >
      {label ?? type}
    </span>
  )
}

function EventChip({ type }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
      {type}
    </span>
  )
}

function RowDrawer({ row, onClose }) {
  if (!row) return null
  return (
    <div className="fixed inset-y-0 right-0 z-30 w-full max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatTs(row.occurred_at)}</div>
          <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {row.message ?? row.event_type}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[13px]">
        <div className="flex flex-wrap gap-2 items-center">
          <ActorPill type={row.actor_type} label={row.actor_label || row.actor_type} />
          <EventChip type={row.event_type} />
        </div>
        {row.actor_id ? (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">Actor id</div>
            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{row.actor_id}</div>
          </div>
        ) : null}
        {row.workflow_id ? (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">Workflow</div>
            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">{row.workflow_id}</div>
          </div>
        ) : null}
        {row.candidate_id ? (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">Candidate</div>
            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{row.candidate_id}</div>
          </div>
        ) : null}
        {row.bulk_id ? (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">Bulk batch</div>
            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{row.bulk_id}</div>
          </div>
        ) : null}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Payload</div>
          <pre className="text-[11px] font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 overflow-x-auto leading-relaxed">
            {JSON.stringify(row.payload ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default function Activity({ user }) {
  const userId = user?.userId
  const [actorType, setActorType] = useState('')
  const [eventType, setEventType] = useState('')
  const [rows, setRows] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeRow, setActiveRow] = useState(null)
  const inFlightRef = useRef(false)

  const fetchPage = useCallback(async ({ reset = false } = {}) => {
    if (!userId || inFlightRef.current) return
    inFlightRef.current = true
    setLoading(true); setError(null)
    try {
      const res = await listActivity(userId, {
        actorType: actorType || undefined,
        eventType: eventType || undefined,
        cursor: reset ? undefined : (cursor ?? undefined),
        limit: 50,
      })
      setRows(prev => reset ? res.rows : [...prev, ...res.rows])
      setCursor(res.next_cursor ?? null)
      setHasMore(Boolean(res.next_cursor))
    } catch (err) {
      setError(err?.message || 'Failed to load activity')
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
  }, [userId, actorType, eventType, cursor])

  useEffect(() => {
    if (!userId) return
    setRows([]); setCursor(null); setHasMore(false)
    fetchPage({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, actorType, eventType])

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          Activity log
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          A complete audit trail — every action by an admin, agent, candidate, or system, across every candidate. Filter by who did it or what kind of event it was.
        </p>
      </header>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-500 dark:text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            className="text-[13px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-1.5 min-w-[160px]"
            value={actorType}
            onChange={e => setActorType(e.target.value)}
          >
            {ACTOR_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="text-[13px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-1.5 min-w-[200px]"
            value={eventType}
            onChange={e => setEventType(e.target.value)}
          >
            {EVENT_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(actorType || eventType) ? (
            <button
              onClick={() => { setActorType(''); setEventType('') }}
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {rows.length === 0 && !loading ? (
          <div className="px-6 py-12 text-center text-[13px] text-slate-500 dark:text-slate-400">
            Nothing logged yet for this filter — try broadening it.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(row => (
              <li
                key={row.id}
                className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors"
                onClick={() => setActiveRow(row)}
              >
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-36 shrink-0">
                  {formatTs(row.occurred_at)}
                </div>
                <ActorPill type={row.actor_type} label={row.actor_label || row.actor_type} />
                <EventChip type={row.event_type} />
                <div className="flex-1 text-[13px] text-slate-700 dark:text-slate-300 truncate">
                  {row.message || (row.candidate_id ? `For ${row.candidate_id}` : '')}
                </div>
                {row.workflow_id ? (
                  <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                    {row.workflow_id}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        {hasMore ? (
          <button
            onClick={() => fetchPage()}
            disabled={loading}
            className="px-4 py-2 text-[13px] rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load older'}
          </button>
        ) : rows.length > 0 ? (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">— end of log —</span>
        ) : null}
      </div>

      {activeRow ? <RowDrawer row={activeRow} onClose={() => setActiveRow(null)} /> : null}
    </div>
  )
}
