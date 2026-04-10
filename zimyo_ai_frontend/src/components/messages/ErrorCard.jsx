import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorCard({ msg, onAction }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-2 animate-fade-in-scale">
      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">{msg.message}</p>
        {msg.retry && (
          <button
            onClick={() => onAction?.({ action: 'retry' })}
            className="flex items-center gap-1 mt-2 text-xs text-red-600 hover:text-red-700 font-medium"
          >
            <RefreshCw className="w-3 h-3" />
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
