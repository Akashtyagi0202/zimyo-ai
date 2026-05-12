/**
 * Smart action buttons that appear below bot messages.
 *
 * Pattern-based static chips that match the bot's question text.
 * Dynamic lists (e.g. leave types) are sent by backend as a
 * {type: "chips"} ui block and rendered via MessageRenderer instead.
 */

import { cn } from '@/lib/utils'

const COLORS = [
  'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20 dark:hover:bg-rose-500/20',
  'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 dark:hover:bg-blue-500/20',
  'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20',
  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20 dark:hover:bg-amber-500/20',
  'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20 dark:hover:bg-violet-500/20',
  'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 hover:border-pink-300 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/20 dark:hover:bg-pink-500/20',
  'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20 dark:hover:bg-cyan-500/20',
  'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20 dark:hover:bg-orange-500/20',
]

const PATTERNS = [
  {
    key: 'half_day',
    test: (text) =>
      /which half|कौनसा हाफ|half.*day|first half.*second half|पहला.*दूसरा/i.test(text),
    options: [
      { label: 'Full Day', value: 'Full day' },
      { label: 'First Half (Morning)', value: 'First half' },
      { label: 'Second Half (Afternoon)', value: 'Second half' },
    ],
  },
  {
    key: 'date',
    test: (text) =>
      /start date|which date|कब से|from when|kis date|kab se|कब तक|end date/i.test(text),
    options: (() => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dayAfter = new Date(today)
      dayAfter.setDate(dayAfter.getDate() + 2)
      const fmt = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      const fmtApi = (d) => d.toISOString().split('T')[0]
      return [
        { label: `Today (${fmt(today)})`, value: `Today ${fmtApi(today)}` },
        { label: `Tomorrow (${fmt(tomorrow)})`, value: `Tomorrow ${fmtApi(tomorrow)}` },
        { label: fmt(dayAfter), value: fmtApi(dayAfter) },
      ]
    })(),
  },
  {
    key: 'confirm',
    test: (text) =>
      /reply.*yes.*submit.*no.*cancel|confirm.*leave|confirm.*duty/i.test(text),
    options: [
      { label: 'Yes, Submit', value: 'yes' },
      { label: 'No, Cancel', value: 'no' },
    ],
  },
  {
    key: 'duty_reason',
    test: (text) =>
      /reason.*on.?duty|reason.*regulariz|on.?duty.*reason|regulariz.*reason/i.test(text) && !/applied|success/i.test(text),
    options: [
      { label: 'Client meeting', value: 'Client meeting' },
      { label: 'Work from home', value: 'Work from home' },
      { label: 'Field work', value: 'Field work' },
      { label: 'Forgot to punch', value: 'Forgot to punch' },
      { label: 'Network issue', value: 'Network issue' },
    ],
  },
  {
    key: 'reason',
    test: (text) =>
      /reason|कारण|vajah|wajah|why/i.test(text) && !/applied|success/i.test(text),
    options: [
      { label: 'Not feeling well', value: 'Not feeling well' },
      { label: 'Personal work', value: 'Personal work' },
      { label: 'Family emergency', value: 'Family emergency' },
      { label: 'Medical appointment', value: 'Medical appointment' },
    ],
  },
  {
    key: 'time',
    test: (text) =>
      /time range|समय|from time|to time|what time|kis time|kab tak|start time|end time/i.test(text),
    options: [
      { label: '9:00 AM to 6:00 PM', value: '9:00 AM to 6:00 PM' },
      { label: '10:00 AM to 7:00 PM', value: '10:00 AM to 7:00 PM' },
      { label: '9:30 AM to 6:30 PM', value: '9:30 AM to 6:30 PM' },
    ],
  },
  {
    key: 'end_time',
    test: (text) =>
      /end time|kab tak.*\?|till when|to time/i.test(text),
    options: [
      { label: '6:00 PM', value: '6:00 PM' },
      { label: '6:30 PM', value: '6:30 PM' },
      { label: '7:00 PM', value: '7:00 PM' },
    ],
  },
  {
    key: 'attendance',
    test: (text) =>
      /check.?in.*check.?out|what would you like|kya karna/i.test(text),
    options: [
      { label: 'Check In', value: 'Check in' },
      { label: 'Check Out', value: 'Check out' },
    ],
  },
]

export default function ActionButtons({ text, onSelect }) {
  if (!text) return null
  if (/^[✅❌]/.test(text.trim())) return null

  const match = PATTERNS.find((p) => p.test(text))
  if (!match || !match.options) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-slide-up">
      {match.options.map((opt, i) => (
        <button
          key={opt.label}
          onClick={() => onSelect(opt.value)}
          className={cn(
            'animate-stagger inline-flex items-center px-3.5 py-1.5 rounded-full border text-xs font-medium',
            'transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            COLORS[i % COLORS.length]
          )}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
