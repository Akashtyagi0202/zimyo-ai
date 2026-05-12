import {
  CalendarDays,
  FileSearch,
  UserPlus,
  Briefcase,
  ClipboardCheck,
  PieChart,
  Shield,
  Clock,
} from 'lucide-react'

// Single source of truth for the agent catalogue. AgentSelect renders the
// grid; Chat reads `chat.*` for header/composer copy. Add a new agent here
// and both surfaces pick it up.
export const AGENTS = [
  {
    id: 'leave-attendance',
    title: 'Leave & Attendance',
    subtitle: 'Agent',
    description:
      'Apply leave, on-duty, regularization, check balance, mark attendance, holidays & salary',
    icon: CalendarDays,
    gradient: 'from-blue-500 to-indigo-600',
    available: true,
    route: '/chat/leave-attendance',
    features: [
      { icon: CalendarDays, label: 'Apply Leave' },
      { icon: Briefcase, label: 'On-Duty / WFH' },
      { icon: ClipboardCheck, label: 'Regularization' },
      { icon: PieChart, label: 'Leave Balance' },
    ],
    chat: {
      title: 'Leave & Attendance Agent',
      subtitle: 'Leave, On-Duty, Regularization, Balance, Holidays, Salary',
      placeholder:
        'Type your message... (e.g., apply leave, check balance, WFH request)',
      inputHint: 'Leave | On-Duty | Regularization | Balance | Holidays | Salary',
    },
  },
  {
    id: 'policy',
    title: 'Policy',
    subtitle: 'Agent',
    description:
      'Ask questions about company policies, HR rules, guidelines & benefits',
    icon: FileSearch,
    gradient: 'from-violet-500 to-purple-600',
    available: true,
    route: '/chat/policy',
    features: [
      { icon: FileSearch, label: 'Policy Search' },
      { icon: Shield, label: 'HR Rules' },
      { icon: Clock, label: 'Guidelines' },
      { icon: ClipboardCheck, label: 'Benefits' },
    ],
    chat: {
      title: 'Policy Agent',
      subtitle: 'Company policies, HR rules, guidelines & benefits',
      placeholder: 'Ask about any company policy... (e.g., what is the leave policy?)',
      inputHint: 'Leave Policy | HR Rules | Guidelines | Benefits',
    },
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    subtitle: 'Agent',
    description: 'CTC computation, offer letter generation, candidate onboarding flow',
    icon: UserPlus,
    gradient: 'from-amber-500 to-orange-600',
    available: true,
    route: '/chat/onboarding',
    features: [
      { icon: UserPlus, label: 'CTC Compute' },
      { icon: Briefcase, label: 'Offer Letter' },
      { icon: ClipboardCheck, label: 'Documents' },
      { icon: Shield, label: 'Verification' },
    ],
    chat: {
      title: 'Onboarding Agent',
      subtitle: 'CTC computation, offer letter, candidate onboarding',
      placeholder: 'Type your message... (e.g., compute CTC for Akash)',
      inputHint: 'CTC Compute | Offer Letter | Documents | Verification',
    },
  },
]

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a]))

export const DEFAULT_AGENT_ID = 'leave-attendance'
