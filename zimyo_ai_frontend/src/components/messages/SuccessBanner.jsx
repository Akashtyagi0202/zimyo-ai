import { CheckCircle2 } from 'lucide-react'

export default function SuccessBanner({ msg }) {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl mt-2 animate-fade-in-scale">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{msg.message}</p>
        {msg.next_stage && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Next: {msg.next_stage}</p>
        )}
      </div>
    </div>
  )
}
