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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 bg-grid">
      {/* Header */}
      <header className="glass border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-600/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Zimyo AI</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose your assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.userId}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-all active:scale-95"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zimyo-50 dark:bg-zimyo-900/30 border border-zimyo-200 dark:border-zimyo-700/40 rounded-full text-xs font-medium text-zimyo-600 dark:text-zimyo-300 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered HR Assistant
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            <span className="animate-wave">👋</span> Namaste! <span className="gradient-text">Kya help chahiye?</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 text-base">
            Select an AI agent to get started
          </p>
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AGENTS.map((agent, index) => {
            const Icon = agent.icon
            return (
              <div
                key={agent.id}
                onClick={() => handleSelect(agent)}
                className={`animate-stagger relative rounded-2xl border-2 bg-white dark:bg-gray-800 p-6 transition-all ${
                  agent.available
                    ? `${agent.borderColor} cursor-pointer card-hover ${agent.shadowColor}`
                    : 'border-gray-200 dark:border-gray-700 opacity-70 cursor-not-allowed'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Coming Soon Badge */}
                {!agent.available && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full">
                    <Lock className="w-3 h-3 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500">Coming Soon</span>
                  </div>
                )}

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5 shadow-sm shadow-indigo-600/20">
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {agent.title}
                  <span className="text-sm font-medium text-gray-400 dark:text-gray-500 ml-2">{agent.subtitle}</span>
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  {agent.description}
                </p>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-2 mt-5">
                  {agent.features.map((feat) => {
                    const FeatIcon = feat.icon
                    return (
                      <span
                        key={feat.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          agent.available
                            ? `${agent.bgLight} text-gray-700 dark:bg-gray-700/60 dark:text-gray-200`
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
                  <div className="flex items-center gap-2 mt-6 text-sm font-semibold text-zimyo-600 dark:text-zimyo-400 group">
                    <span>Start Chat</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
