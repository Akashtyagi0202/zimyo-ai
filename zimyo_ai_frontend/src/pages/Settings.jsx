import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import useDefaults from '../hooks/useDefaults'
import WorkflowSection from '../components/settings/WorkflowSection'
import CtcSection from '../components/settings/CtcSection'
import OfferLetterSection from '../components/settings/OfferLetterSection'

export default function Settings({ user }) {
  const navigate = useNavigate()
  const {
    loading, saving,
    feedback, setFeedback,
    ctc, setCtc, ctcOptions,
    ol, setOl, olCcInput, setOlCcInput, olOptions,
    wf, setWf, wfOptions,
    save,
    parseCcList,
  } = useDefaults(user?.userId)

  // Any field edit clears the last save toast — surfacing stale "Saved" while
  // the user is mid-edit is more confusing than helpful.
  const clearFeedback = () => setFeedback(null)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/agents')}
                  className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Back to agents</TooltipContent>
            </Tooltip>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-600/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                Settings
              </h1>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                Agent defaults for your account
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200 leading-tight">
                {user?.userId}
              </p>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 capitalize leading-tight">
                {user?.role}
              </p>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Avatar className="h-8 w-8 rounded-lg bg-indigo-500">
              <AvatarFallback className="rounded-lg bg-indigo-500 text-white text-[11px] font-semibold uppercase">
                {(user?.userId || 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading your settings…
          </div>
        ) : (
          <div className="space-y-6">
            <WorkflowSection
              wf={wf}
              setWf={setWf}
              wfOptions={wfOptions}
              saving={saving}
              onChange={clearFeedback}
            />
            <CtcSection
              ctc={ctc}
              setCtc={setCtc}
              ctcOptions={ctcOptions}
              saving={saving}
              onChange={clearFeedback}
            />
            <OfferLetterSection
              ol={ol}
              setOl={setOl}
              olOptions={olOptions}
              olCcInput={olCcInput}
              setOlCcInput={setOlCcInput}
              parseCcList={parseCcList}
              saving={saving}
              onChange={clearFeedback}
            />

            {feedback && (
              <div
                className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                  feedback.kind === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {feedback.kind === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-end gap-3">
          <button
            onClick={() => navigate('/agents')}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-xl shadow-sm shadow-indigo-600/20 transition-all active:scale-[0.98]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save defaults'}
          </button>
        </div>
      </div>
    </div>
  )
}
