import {
  CalendarOff,
  Briefcase,
  ClipboardCheck,
  PieChart,
  FileQuestion,
  CalendarDays,
  Wallet,
  Sun,
  FileSearch,
  Shield,
  BookOpen,
  HelpCircle,
  Sparkles,
  MessageCircle,
  UserPlus,
  FileText,
  Users,
  Calculator,
} from 'lucide-react'

const LEAVE_ACTIONS = [
  {
    label: 'Apply Leave',
    message: 'I want to apply for leave',
    icon: CalendarOff,
    color: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:border-orange-300',
    iconBg: 'bg-orange-100',
  },
  {
    label: 'Leave Balance',
    message: 'Show my leave balance',
    icon: PieChart,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
    iconBg: 'bg-emerald-100',
  },
  {
    label: 'On-Duty / WFH',
    message: 'I want to apply for on duty',
    icon: Briefcase,
    color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    iconBg: 'bg-blue-100',
  },
  {
    label: 'Regularization',
    message: 'I want to apply for regularization',
    icon: ClipboardCheck,
    color: 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 hover:border-violet-300',
    iconBg: 'bg-violet-100',
  },
  {
    label: 'Upcoming Holidays',
    message: 'Show upcoming holidays',
    icon: CalendarDays,
    color: 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100 hover:border-pink-300',
    iconBg: 'bg-pink-100',
  },
  {
    label: 'Salary Slip',
    message: 'Show my salary slip',
    icon: Wallet,
    color: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
    iconBg: 'bg-amber-100',
  },
  {
    label: 'Mark Attendance',
    message: 'Mark my attendance check-in',
    icon: Sun,
    color: 'bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100 hover:border-teal-300',
    iconBg: 'bg-teal-100',
  },
  {
    label: 'Cancel Leave',
    message: 'I want to cancel my leave',
    icon: CalendarOff,
    color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300',
    iconBg: 'bg-red-100',
  },
]

const POLICY_ACTIONS = [
  {
    label: 'Leave Policy',
    message: 'Tell me about the leave policy',
    icon: FileSearch,
    color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    iconBg: 'bg-blue-100',
  },
  {
    label: 'Attendance Policy',
    message: 'What is the attendance policy?',
    icon: ClipboardCheck,
    color: 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 hover:border-violet-300',
    iconBg: 'bg-violet-100',
  },
  {
    label: 'HR Guidelines',
    message: 'Show me the HR guidelines',
    icon: Shield,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
    iconBg: 'bg-emerald-100',
  },
  {
    label: 'Benefits',
    message: 'What employee benefits are available?',
    icon: BookOpen,
    color: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
    iconBg: 'bg-amber-100',
  },
  {
    label: 'WFH Policy',
    message: 'What is the work from home policy?',
    icon: Briefcase,
    color: 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300',
    iconBg: 'bg-cyan-100',
  },
  {
    label: 'General Query',
    message: 'I have a question about company rules',
    icon: HelpCircle,
    color: 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100 hover:border-pink-300',
    iconBg: 'bg-pink-100',
  },
]

const ONBOARDING_ACTIONS = [
  {
    label: 'Compute CTC',
    message: 'Test LOI Explore ka CTC compute kro',
    icon: Calculator,
    color: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
    iconBg: 'bg-amber-100',
  },
  {
    label: 'Candidate List',
    message: 'Add Candidate CTC bucket mein kaun kaun hai?',
    icon: Users,
    color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    iconBg: 'bg-blue-100',
  },
  {
    label: 'New Candidate',
    message: 'Naya candidate add karna hai',
    icon: UserPlus,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
    iconBg: 'bg-emerald-100',
  },
  {
    label: 'Offer Letter',
    message: 'Offer letter generate karo',
    icon: FileText,
    color: 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 hover:border-violet-300',
    iconBg: 'bg-violet-100',
  },
]

const ONBOARDING_PROMPTS = [
  'Akash ka CTC compute kro',
  'Test LOI Explore ka gross 5 lakh krdo',
  'Add Candidate CTC mein kitne pending hain?',
  'Candidate ko offer letter bhejo',
]

const LEAVE_PROMPTS = [
  'Sick leave for tomorrow',
  'WFH today 10am to 7pm',
  'Meri leave balance dikhao',
  'Apply regularization for yesterday',
  'Upcoming holidays dikhao',
]

const POLICY_PROMPTS = [
  'Leave policy kya hai?',
  'WFH ke rules batao',
  'Attendance policy explain karo',
  'Employee benefits kya hain?',
  'Sick leave kitni milti hai?',
]

export default function QuickActions({ agentType, onAction }) {
  const isPolicy = agentType === 'policy'
  const isOnboarding = agentType === 'onboarding'
  const actions = isOnboarding ? ONBOARDING_ACTIONS : isPolicy ? POLICY_ACTIONS : LEAVE_ACTIONS
  const prompts = isOnboarding ? ONBOARDING_PROMPTS : isPolicy ? POLICY_PROMPTS : LEAVE_PROMPTS

  return (
    <div className="max-w-3xl mx-auto px-4 animate-fade-in">
      {/* Welcome */}
      <div className="text-center mb-10 mt-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zimyo-50 border border-zimyo-200 rounded-full text-xs font-medium text-zimyo-600 mb-4 animate-fade-in-scale">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered HR Assistant
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isOnboarding ? (
            <>Onboarding <span className="gradient-text">Assistant</span></>
          ) : isPolicy ? (
            <>Policy <span className="gradient-text">Assistant</span></>
          ) : (
            <><span className="animate-wave">👋</span> Namaste! <span className="gradient-text">Kya help chahiye?</span></>
          )}
        </h2>
        <p className="text-gray-500 mt-2.5 text-sm max-w-md mx-auto">
          {isOnboarding
            ? 'Compute CTC, send offer letters, and manage candidate onboarding'
            : isPolicy
            ? 'Ask me anything about company policies & HR rules'
            : 'Choose a quick action or type your request below'}
        </p>
      </div>

      {/* Action Grid */}
      <div className={`grid gap-3 ${(isPolicy || isOnboarding) ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => onAction(action.message)}
              className={`animate-stagger card-hover flex flex-col items-center gap-2.5 p-4 rounded-2xl border text-sm font-medium ${action.color}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className={`w-10 h-10 ${action.iconBg} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">{action.label}</span>
            </button>
          )
        })}
      </div>

      {/* Example prompts */}
      <div className="mt-8 p-5 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm animate-stagger" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-xs font-semibold text-gray-500">Try saying:</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onAction(prompt)}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-zimyo-50 hover:border-zimyo-300 hover:text-zimyo-700 transition-all hover:shadow-sm active:scale-95"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
