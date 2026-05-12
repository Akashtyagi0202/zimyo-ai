import { GitBranch } from 'lucide-react'

export default function WorkflowSection({ wf, setWf, wfOptions, saving, onChange }) {
  const pickWorkflow = (id) => {
    const picked = wfOptions.find((w) => String(w.id) === String(id))
    setWf({ id: id || '', name: picked?.name || '' })
    onChange?.()
  }

  return (
    <>
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-full text-xs font-medium text-indigo-600 dark:text-indigo-300 mb-3">
          <GitBranch className="w-3.5 h-3.5" />
          Active onboarding workflow
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Workflow selection</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          All onboarding flows (candidate list, details, CTC, offer letter) run against this workflow.
          You can also change it from chat by picking a workflow when the agent asks.
        </p>
      </div>

      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Active workflow</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {wf.id
                ? <>Currently running against <strong className="text-slate-700 dark:text-slate-200">{wf.name || `Workflow ${wf.id}`}</strong>.</>
                : 'No workflow saved yet — the agent will ask you once on the first onboarding query.'}
            </p>
          </div>
        </div>
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Pick workflow
        </label>
        <select
          value={wf.id}
          onChange={(e) => pickWorkflow(e.target.value)}
          disabled={saving}
          className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
        >
          <option value="">— Select a workflow —</option>
          {wfOptions.map((w) => (
            <option key={w.id} value={w.id}>{w.name || `Workflow ${w.id}`}</option>
          ))}
        </select>
        {wfOptions.length === 0 && (
          <p className="text-xs text-slate-400 mt-1">
            No workflows returned by Zimyo. Check if your admin has any configured under Onboarding.
          </p>
        )}
      </section>
    </>
  )
}
