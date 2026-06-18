import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, Users } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { listWorkflows, listCandidates } from '@/api/client'

// Wraps the 4 onboarding-admin pages (Mission Control / Candidates /
// Approvals / Activity) with the same Sidebar the chat surface uses.
// `activeAgentId="onboarding"` forces the sidebar into onboarding nav
// mode; the absence of `onOnboardingViewChange` tells the sidebar these
// are route-based pages, not internal chat panels.
//
// Adds a thin top strip (breadcrumb left, live counters right) that
// matches the video's admin chrome. Counters poll real data — the
// candidate roster from listCandidates and live agent count from the
// non-terminal workflow rows already used by Mission Control.

const ROUTE_LABELS = {
  '/dashboard':       'Dashboard',
  '/mission-control': 'Mission Control',
  '/candidates':      'Candidates',
  '/approvals':       'Needs Approval',
  '/activity':        'Activity',
  '/settings':        'Settings',
}

export default function OnboardingShell({ user, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const [liveAgents, setLiveAgents] = useState(null)
  const [candidates, setCandidates] = useState(null)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    const fetchCounts = async () => {
      const [wfRes, candRes] = await Promise.allSettled([
        listWorkflows(user.userId, { limit: 200 }),
        listCandidates(user.userId, { page: 1 }),
      ])
      if (cancelled) return
      if (wfRes.status === 'fulfilled') {
        setLiveAgents(wfRes.value?.rows?.length ?? 0)
      }
      if (candRes.status === 'fulfilled') {
        const total = candRes.value?.pagination?.total
        setCandidates(typeof total === 'number' ? total : (candRes.value?.rows?.length ?? 0))
      }
    }
    fetchCounts()
    // 30s matches Mission Control's poll cadence — same SSE-replacement
    // window. SSE lands in a later slice and will obsolete the interval.
    const id = setInterval(fetchCounts, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [user?.userId])

  const pageLabel = ROUTE_LABELS[location.pathname]
    || (location.pathname.startsWith('/candidates/') ? 'Candidates' : '')

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <Sidebar
        user={user}
        onLogout={onLogout}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        activeAgentId="onboarding"
      />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-900 px-8 py-2.5 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Admin</span>
            {pageLabel ? (
              <>
                <span className="mx-1.5 text-slate-300 dark:text-slate-700">›</span>
                <span className="text-slate-700 dark:text-slate-300">{pageLabel}</span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {candidates != null ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <Users className="w-3 h-3" />
                {candidates} candidate{candidates === 1 ? '' : 's'}
              </span>
            ) : null}
            {liveAgents != null ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300">
                <Bot className="w-3 h-3" />
                {liveAgents} live agent{liveAgents === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
