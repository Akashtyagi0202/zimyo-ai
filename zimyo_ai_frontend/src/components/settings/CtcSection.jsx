import {
  Settings as SettingsIcon,
  ShieldCheck,
  CalendarRange,
  Briefcase,
  Gift,
} from 'lucide-react'
import { Toggle, Radio, Select } from './_primitives'

const TOGGLES = [
  { key: 'esic_enabled', label: 'Enforce ESIC', hint: 'Apply ESIC deduction by default when computing CTC.' },
  { key: 'pf_enabled',   label: 'Enforce PF',   hint: 'Apply Provident Fund deduction by default.' },
  { key: 'lwf_enabled',  label: 'Enforce LWF',  hint: 'Apply Labour Welfare Fund deduction by default.' },
  { key: 'pt_enabled',   label: 'Enforce PT',   hint: 'Apply Professional Tax deduction by default.' },
]

const STRATEGY_OPTIONS = [
  { value: 'next_month',    label: 'Next month',    hint: 'Default effective date = 1st of next month.' },
  { value: 'current_month', label: 'Current month', hint: 'Default effective date = 1st of current month.' },
  { value: '',              label: 'Ask me each time', hint: 'No default — I will pick per candidate.' },
]

export default function CtcSection({ ctc, setCtc, ctcOptions, saving, onChange }) {
  const toggle = (key) => (v) => {
    setCtc((prev) => ({ ...prev, [key]: v ? 1 : 0 }))
    onChange?.()
  }

  const pickStrategy = (v) => {
    setCtc((prev) => ({ ...prev, applicable_from_strategy: v }))
    onChange?.()
  }

  const pickPlan = (field, list) => (id) => {
    const plan = list.find((p) => String(p.id) === String(id))
    setCtc((prev) => ({
      ...prev,
      [`${field}_id`]:   id || '',
      [`${field}_name`]: plan?.name || '',
    }))
    onChange?.()
  }

  return (
    <>
      <div className="pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-full text-xs font-medium text-indigo-600 dark:text-indigo-300 mb-3">
          <SettingsIcon className="w-3.5 h-3.5" />
          CTC compute defaults
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your saved defaults</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          These apply automatically when you run "compute CTC". Override any of them for a single
          computation via <em>Edit options</em> on the review card.
        </p>
      </div>

      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <CalendarRange className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Applicable-from month</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strategy to pick the effective date for every CTC. I'll resolve it to an actual month from
              the candidate's allowed list at compute time.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {STRATEGY_OPTIONS.map((o) => (
            <Radio
              key={o.value || 'ask'}
              name="applicable_from_strategy"
              value={o.value}
              selected={ctc.applicable_from_strategy}
              onChange={pickStrategy}
              label={o.label}
              hint={o.hint}
              disabled={saving}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
        <div className="flex items-start gap-3 p-6 pb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Compliance toggles</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Applied silently on every CTC run. Override on the review card if needed.
            </p>
          </div>
        </div>
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.hint}</p>
            </div>
            <Toggle checked={!!ctc[t.key]} onChange={toggle(t.key)} disabled={saving} />
          </div>
        ))}
      </section>

      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Default plans</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              OT and Bonus plans to pre-select. Options come from a sample candidate's payroll filters.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <Select
            icon={Briefcase}
            label="Overtime plan"
            value={ctc.ot_plan_id}
            onChange={pickPlan('ot_plan', ctcOptions.ot_plans)}
            options={ctcOptions.ot_plans}
            disabled={saving}
            emptyHint="No OT plans available — run a CTC compute first so I can pick up your org's plans."
          />
          <Select
            icon={Gift}
            label="Bonus plan"
            value={ctc.bonus_plan_id}
            onChange={pickPlan('bonus_plan', ctcOptions.bonus_plans)}
            options={ctcOptions.bonus_plans}
            disabled={saving}
            emptyHint="No Bonus plans available — run a CTC compute first so I can pick up your org's plans."
          />
        </div>
      </section>
    </>
  )
}
