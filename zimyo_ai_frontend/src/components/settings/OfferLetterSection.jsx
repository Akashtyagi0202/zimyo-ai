import { Mail, FileText, Users } from 'lucide-react'
import { Select } from './_primitives'

export default function OfferLetterSection({
  ol, setOl, olOptions,
  olCcInput, setOlCcInput,
  parseCcList,
  saving, onChange,
}) {
  const pickTemplate = (id) => {
    const tpl = olOptions.templates.find((t) => String(t.id) === String(id))
    setOl((prev) => ({
      ...prev,
      default_template_id:   id || '',
      default_template_name: tpl?.name || '',
    }))
    onChange?.()
  }

  return (
    <>
      <div className="pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-full text-xs font-medium text-indigo-600 dark:text-indigo-300 mb-3">
          <Mail className="w-3.5 h-3.5" />
          Offer letter defaults
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your saved defaults</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          These apply automatically when you run "send offer letter". Override any of them for a single
          send on the editor / CC step.
        </p>
      </div>

      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Default offer template</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              When set, I'll skip the template chip pick and open the editor with this template pre-loaded.
            </p>
          </div>
        </div>
        <Select
          icon={FileText}
          label="Offer template"
          value={ol.default_template_id}
          onChange={pickTemplate}
          options={olOptions.templates}
          disabled={saving}
          emptyHint="No offer templates available — configure one under Onboarding → Templates first."
        />
      </section>

      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Default CC recipients</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              These emails get pre-selected in the CC step on every send. Comma-separated.
            </p>
          </div>
        </div>
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          CC emails
        </label>
        <textarea
          value={olCcInput}
          onChange={(e) => { setOlCcInput(e.target.value); onChange?.() }}
          onBlur={(e) => setOlCcInput(parseCcList(e.target.value).join(', '))}
          disabled={saving}
          rows={2}
          placeholder="hr@zimyo.com, manager@zimyo.com"
          className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">
          Tip: duplicates (case-insensitive) are removed on save.
        </p>
      </section>
    </>
  )
}
