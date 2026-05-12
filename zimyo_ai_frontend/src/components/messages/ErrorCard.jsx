import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorCard({ msg, onAction }) {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl mt-2 animate-fade-in-scale">
      <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-rose-800 dark:text-rose-200">{msg.message}</p>
        {msg.retry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction?.({ action: 'retry' })}
            className="h-7 px-2 mt-1.5 -ml-2 text-xs text-rose-600 dark:text-rose-300 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-500/20"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}
