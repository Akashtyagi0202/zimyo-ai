import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  FileSearch,
  UserPlus,
  Bot,
  LogOut,
  ArrowRight,
  Clock,
  Shield,
  Briefcase,
  ClipboardCheck,
  PieChart,
  Lock,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react'

const AGENTS = [
  {
    id: 'leave-attendance',
    title: 'Leave & Attendance',
    subtitle: 'Agent',
    description: 'Apply leave, on-duty, regularization, check balance, mark attendance, holidays & salary',
    icon: CalendarDays,
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200 hover:border-blue-400',
    shadowColor: 'hover:shadow-blue-200/50',
    features: [
      { icon: CalendarDays, label: 'Apply Leave' },
      { icon: Briefcase, label: 'On-Duty / WFH' },
      { icon: ClipboardCheck, label: 'Regularization' },
      { icon: PieChart, label: 'Leave Balance' },
    ],
    available: true,
    route: '/chat/leave-attendance',
  },
  {
    id: 'policy',
    title: 'Policy',
    subtitle: 'Agent',
    description: 'Ask questions about company policies, HR rules, guidelines & benefits',
    icon: FileSearch,
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200 hover:border-violet-400',
    shadowColor: 'hover:shadow-violet-200/50',
    features: [
      { icon: FileSearch, label: 'Policy Search' },
      { icon: Shield, label: 'HR Rules' },
      { icon: Clock, label: 'Guidelines' },
      { icon: ClipboardCheck, label: 'Benefits' },
    ],
    available: true,
    route: '/chat/policy',
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    subtitle: 'Agent',
    description: 'CTC computation, offer letter generation, candidate onboarding flow',
    icon: UserPlus,
    gradient: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200 hover:border-amber-400',
    shadowColor: 'hover:shadow-amber-200/50',
    features: [
      { icon: UserPlus, label: 'CTC Compute' },
      { icon: Briefcase, label: 'Offer Letter' },
      { icon: ClipboardCheck, label: 'Documents' },
      { icon: Shield, label: 'Verification' },
    ],
    available: true,
    route: '/chat/onboarding',
  },
]

export default function AgentSelect({ user, onLogout }) {
  const navigate = useNavigate()

  const handleSelect = (agent) => {
    if (!agent.available) return
    navigate(agent.route)
  }

  const fullName = (user?.name || '').trim()
  const firstName = fullName ? fullName.split(/\s+/)[0] : ''
  const headerLabel = fullName || user?.userId || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="glass border-b border-gray-200/60 dark:border-gray-800/60 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Bot className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">Zimyo AI</h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">HR Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{headerLabel}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">
                {user?.designation ? `${user.designation} · ${user.role}` : user?.role}
              </p>
            </div>
            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-800 pl-3">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 transition-all active:scale-95"
                title="Settings"
              >
                <SettingsIcon className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 hover:text-red-600 transition-all active:scale-95"
                title="Logout"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Welcome */}
        <div className="mb-14 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-full text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-5 shadow-sm">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            AI-Powered HR Assistant
          </div>
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 leading-[1.1]">
            {firstName ? <>Welcome back, <span className="gradient-text">{firstName}</span></> : <>Welcome to <span className="gradient-text">Zimyo AI</span></>}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 text-base max-w-xl">
            Choose an assistant to get started. Each one is trained for a specific workflow.
          </p>
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {AGENTS.map((agent, index) => {
            const Icon = agent.icon
            return (
              <div
                key={agent.id}
                onClick={() => handleSelect(agent)}
                className={`animate-stagger group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 transition-all duration-300 ${
                  agent.available
                    ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-900/5 dark:hover:shadow-black/20 hover:border-gray-300 dark:hover:border-gray-700'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Gradient accent bar */}
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${agent.gradient} opacity-80`} />

                {/* Coming Soon Badge */}
                {!agent.available && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <Lock className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Soon</span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center mb-5 shadow-lg shadow-gray-900/10`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.25} />
                </div>

                {/* Title */}
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                    {agent.title}
                  </h3>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{agent.subtitle}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed line-clamp-2">
                  {agent.description}
                </p>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {agent.features.map((feat) => {
                    const FeatIcon = feat.icon
                    return (
                      <span
                        key={feat.label}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium ${
                          agent.available
                            ? 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700/60'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        <FeatIcon className="w-3 h-3" />
                        {feat.label}
                      </span>
                    )
                  })}
                </div>

                {/* CTA */}
                {agent.available && (
                  <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Open assistant</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
