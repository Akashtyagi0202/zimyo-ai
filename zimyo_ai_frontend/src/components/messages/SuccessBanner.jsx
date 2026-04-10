import { CheckCircle2 } from 'lucide-react'

export default function SuccessBanner({ msg }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mt-2 animate-fade-in-scale">
      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-green-800">{msg.message}</p>
        {msg.next_stage && (
          <p className="text-xs text-green-600 mt-1">Next: {msg.next_stage}</p>
        )}
      </div>
    </div>
  )
}
