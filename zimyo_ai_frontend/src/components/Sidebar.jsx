import {
  LogOut, ChevronLeft, ChevronRight, Sparkles,
  Settings as SettingsIcon, Sun, Moon, Workflow,
  Bot, Users as UsersIcon, Inbox, Clock, LayoutDashboard,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import useDarkMode from '@/hooks/useDarkMode'
import { AGENTS } from '@/config/agents'

// Onboarding-agent context. Two groups:
//   • IN_CHAT nav items toggle the main panel inside Chat.jsx via the
//     `onboardingView` prop (no URL change — they're VIEWS within
//     /chat/onboarding).
//   • ADMIN nav items navigate to dedicated routes — used both inside the
//     chat layout and inside the OnboardingShell wrapper that hosts the
//     admin pages. They reuse the same sidebar component so the panel
//     stays anchored across navigations.
// Settings stays rendered separately below so it remains a hard route.
const ONBOARDING_NAV_CHAT = [
  { id: 'assistant', label: 'Assistant', subtitle: 'Just ask — voice or type', icon: Sparkles },
  { id: 'workflow',  label: 'Workflow',  subtitle: 'Design the journey',       icon: Workflow },
]
const ONBOARDING_NAV_ADMIN = [
  { route: '/dashboard',       label: 'Dashboard',       subtitle: 'Today at a glance',   icon: LayoutDashboard },
  { route: '/mission-control', label: 'Mission Control', subtitle: 'Live agents',         icon: Bot },
  { route: '/candidates',      label: 'Candidates',      subtitle: 'Roster + status',     icon: UsersIcon },
  { route: '/approvals',       label: 'Needs Approval',  subtitle: 'Plans waiting',       icon: Inbox },
  { route: '/activity',        label: 'Activity',        subtitle: 'Audit log',           icon: Clock },
]

export default function Sidebar({
  onLogout,
  user,
  collapsed,
  onToggleCollapse,
  activeAgentId,
  onboardingView,
  onOnboardingViewChange,
}) {
  const navigate = useNavigate()
  const { isDark, setTheme } = useDarkMode()
  const isOnboarding = activeAgentId === 'onboarding'

  if (collapsed) {
    return (
      <div className="w-14 sidebar-transition bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-3 gap-1.5 border-r border-slate-100 dark:border-white/10">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8 text-slate-500 dark:text-white/60">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Separator className="bg-slate-100 dark:bg-white/5 my-1 w-8" />
        {isOnboarding
          ? (
            <>
              {ONBOARDING_NAV_CHAT.map((item) => {
                const Icon = item.icon
                const isActive = onboardingView === item.id
                // When `onOnboardingViewChange` is wired (we're inside Chat.jsx),
                // these toggle internal panels. Otherwise they're a hard route
                // back to /chat/onboarding so the user can return to chat.
                if (onOnboardingViewChange) {
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      size="icon"
                      onClick={() => onOnboardingViewChange(item.id)}
                      title={item.label}
                      className={cn(
                        'h-8 w-8',
                        isActive
                          ? 'bg-white text-indigo-600 dark:bg-white/15 dark:text-indigo-300 shadow-sm'
                          : 'text-slate-500 dark:text-white/60'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  )
                }
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/chat/onboarding')}
                    title={item.label}
                    className="h-8 w-8 text-slate-500 dark:text-white/60"
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                )
              })}
              {ONBOARDING_NAV_ADMIN.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.route}
                    to={item.route}
                    title={item.label}
                    className={({ isActive }) =>
                      cn(
                        'h-8 w-8 inline-flex items-center justify-center rounded-md',
                        isActive
                          ? 'bg-white text-indigo-600 dark:bg-white/15 dark:text-indigo-300 shadow-sm'
                          : 'text-slate-500 dark:text-white/60 hover:bg-white/60 dark:hover:bg-white/5'
                      )
                    }
                  >
                    <Icon className="w-4 h-4" />
                  </NavLink>
                )
              })}
            </>
          )
          : AGENTS.filter((a) => a.available).map((agent) => {
              const Icon = agent.icon
              const isActive = activeAgentId === agent.id
              return (
                <Button
                  key={agent.id}
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(agent.route)}
                  title={agent.title}
                  className={cn(
                    'h-8 w-8',
                    isActive
                      ? 'bg-white text-indigo-600 dark:bg-white/15 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 dark:text-white/60'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              )
            })}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          title="Settings"
          className="h-8 w-8 text-slate-500 dark:text-white/60"
        >
          <SettingsIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          title="Logout"
          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-64 sidebar-transition bg-slate-50 dark:bg-slate-900 flex flex-col border-r border-slate-100 dark:border-white/5">
      {/* Brand block — logo + product name + tiny subtitle, like the admin shell. */}
      <div className="px-3 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
        <button onClick={() => navigate('/agents')} className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-slate-800 dark:text-white/90 font-semibold text-[13px] leading-tight truncate">
              Zimyo AI
            </div>
            <div className="text-slate-500 dark:text-white/40 text-[10.5px] leading-tight mt-0.5">
              Chat assistant
            </div>
          </div>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-7 w-7 text-slate-500 dark:text-white/40 shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Nav — onboarding agent gets the 3-item Assistant/Workflow/Settings menu;
          all other agents fall back to the agent-list nav. */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {isOnboarding
            ? (
              <>
                {ONBOARDING_NAV_CHAT.map((item) => {
                  const Icon = item.icon
                  const isActive = onboardingView === item.id
                  // Inside Chat.jsx (onOnboardingViewChange wired): button that
                  // flips the internal panel. Outside (e.g. on /mission-control):
                  // route back to /chat/onboarding.
                  const handleClick = onOnboardingViewChange
                    ? () => onOnboardingViewChange(item.id)
                    : () => navigate('/chat/onboarding')
                  return (
                    <button
                      key={item.id}
                      onClick={handleClick}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition text-left',
                        isActive && onOnboardingViewChange
                          ? 'bg-white text-slate-900 border-slate-200 shadow-sm dark:bg-white/10 dark:text-white dark:border-white/10'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-200 border-transparent dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/85'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0',
                          isActive && onOnboardingViewChange ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-white/40'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium leading-tight truncate">{item.label}</div>
                        <div className="text-[10.5px] opacity-70 leading-tight mt-0.5 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </button>
                  )
                })}

                {ONBOARDING_NAV_ADMIN.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.route}
                      to={item.route}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg border transition',
                          isActive
                            ? 'bg-white text-slate-900 border-slate-200 shadow-sm dark:bg-white/10 dark:text-white dark:border-white/10'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-200 border-transparent dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/85'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'w-4 h-4 shrink-0',
                              isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-white/40'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-medium leading-tight truncate">{item.label}</div>
                            <div className="text-[10.5px] opacity-70 leading-tight mt-0.5 truncate">
                              {item.subtitle}
                            </div>
                          </div>
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </>
            )
            : AGENTS.filter((a) => a.available).map((agent) => {
                const Icon = agent.icon
                const isActive = activeAgentId === agent.id
                return (
                  <NavLink
                    key={agent.id}
                    to={agent.route}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg border transition',
                      isActive
                        ? 'bg-white text-slate-900 border-slate-200 shadow-sm dark:bg-white/10 dark:text-white dark:border-white/10'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-200 border-transparent dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/85'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-white/40'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium leading-tight truncate">{agent.title}</div>
                      <div className="text-[10.5px] opacity-70 leading-tight mt-0.5 truncate">
                        {agent.subtitle === 'Agent' ? agent.chat?.subtitle?.split(',')[0] : agent.subtitle}
                      </div>
                    </div>
                  </NavLink>
                )
              })}

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg border transition',
                isActive
                  ? 'bg-white text-slate-900 border-slate-200 shadow-sm dark:bg-white/10 dark:text-white dark:border-white/10'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-200 border-transparent dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/85'
              )
            }
          >
            {({ isActive }) => (
              <>
                <SettingsIcon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-white/40'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium leading-tight truncate">Settings</div>
                  <div className="text-[10.5px] opacity-70 leading-tight mt-0.5 truncate">
                    Templates & vendors
                  </div>
                </div>
              </>
            )}
          </NavLink>
        </nav>
      </ScrollArea>

      {/* Footer — theme pills + user/logout, like the admin shell's utility column. */}
      <div className="border-t border-slate-100 dark:border-white/10 p-3 space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/30 font-semibold mb-1.5 px-1">
            Theme
          </div>
          <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-800/60 rounded-lg p-1 border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition',
                !isDark
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80'
              )}
            >
              <Sun className="w-3 h-3" />
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition',
                isDark
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80'
              )}
            >
              <Moon className="w-3 h-3" />
              Dark
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-1 py-1 rounded-lg">
          <Avatar className="h-7 w-7 rounded-lg bg-indigo-500">
            <AvatarFallback className="rounded-lg bg-indigo-500 text-white text-[11px] font-semibold uppercase">
              {(user?.userId || 'U').charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-slate-700 dark:text-white/80 text-[12.5px] font-medium truncate">{user?.userId}</p>
            <p className="text-slate-500 dark:text-white/40 text-[10.5px] capitalize font-normal">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="h-7 w-7 text-slate-400 dark:text-white/40 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
