/**
 * Wizard — renders ui.type === "wizard"
 *
 * Multi-step form with step navigation bar, progress, field rendering.
 * Field rendering lives in _FieldRenderer.jsx (shared with Form.jsx).
 *
 * Spec fields:
 *   title, subtitle?, step, totalSteps, steps[], progress{},
 *   navigation?, collectedData?, alerts[], fieldGroups[], fields[], actions[]
 */

import { useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FieldRenderer } from './_FieldRenderer'

const STEP_STATUS = {
  completed: { bg: 'bg-emerald-500',                           text: 'text-white',                            ring: '' },
  active:    { bg: 'bg-indigo-600',                            text: 'text-white',                            ring: 'ring-2 ring-indigo-200 dark:ring-indigo-500/30' },
  upcoming:  { bg: 'bg-slate-200 dark:bg-slate-700',           text: 'text-slate-500 dark:text-slate-400',    ring: '' },
  error:     { bg: 'bg-rose-500',                              text: 'text-white',                            ring: '' },
  skipped:   { bg: 'bg-slate-300 dark:bg-slate-600',           text: 'text-slate-500 dark:text-slate-400',    ring: '' },
}

export default function Wizard({ msg, onAction }) {
  const { title, subtitle, steps = [], progress, alerts = [], fields = [], fieldGroups = [], actions = [] } = msg

  const initial = {}
  fields.forEach((f) => {
    if (f.hidden) return
    initial[f.id] = f.defaultValue ?? (f.type === 'toggle' || f.type === 'checkbox' ? false : '')
  })
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})

  const update = (id, val) => {
    setValues((v) => ({ ...v, [id]: val }))
    setErrors((e) => ({ ...e, [id]: undefined }))
  }

  const validate = () => {
    const errs = {}
    fields.forEach((f) => {
      if (f.hidden) return
      const val = values[f.id]
      if (f.required && (val === '' || val === null || val === undefined)) {
        errs[f.id] = f.validation?.errorMessage || `${f.label} is required`
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAction = (action) => {
    if (action.style === 'ghost' || action.id.includes('back') || action.id === 'save_draft') {
      onAction?.({ action: action.id, values })
      return
    }
    if (validate()) {
      onAction?.({ action: action.id, values })
    }
  }

  const groupedFieldIds = new Set(fieldGroups.flatMap((g) => g.fields || []))
  const ungroupedFields = fields.filter((f) => !groupedFieldIds.has(f.id) && !f.hidden)

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-lg mt-2 animate-fade-in-scale shadow-sm">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {steps.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1">
            {steps.map((s, i) => {
              const cfg = STEP_STATUS[s.status] || STEP_STATUS.upcoming
              return (
                <div key={s.step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                        cfg.bg,
                        cfg.text,
                        cfg.ring
                      )}
                    >
                      {s.status === 'completed' ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span
                      className={cn(
                        'text-[9.5px] mt-1 text-center truncate w-full',
                        s.status === 'active'
                          ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      )}
                    >
                      {s.title}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        'h-0.5 flex-1 mx-1 rounded',
                        s.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {progress && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{progress.label}</span>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">{progress.percent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex items-start gap-2 px-3 py-2 rounded-lg border text-xs',
                a.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200'
                  : a.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200'
                    : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200'
              )}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {fieldGroups.map((group) => {
        const gFields = fields.filter((f) => (group.fields || []).includes(f.id) && !f.hidden)
        return (
          <div key={group.id} className="border-t border-slate-100 dark:border-slate-800">
            <div className="px-4 py-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{group.title}</span>
              {group.description && <p className="text-[10px] text-slate-400 dark:text-slate-500">{group.description}</p>}
            </div>
            <div className="px-4 pb-3 space-y-2">
              {gFields.map((f) => (
                <FieldRenderer
                  key={f.id}
                  field={f}
                  value={values[f.id]}
                  error={errors[f.id]}
                  onChange={(v) => update(f.id, v)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {ungroupedFields.length > 0 && (
        <div className="px-4 pb-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          {ungroupedFields.map((f) => (
            <FieldRenderer
              key={f.id}
              field={f}
              value={values[f.id]}
              error={errors[f.id]}
              onChange={(v) => update(f.id, v)}
            />
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-800">
          {actions.map((a) => (
            <Button
              key={a.id}
              variant={a.style === 'primary' ? 'default' : a.style === 'danger' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleAction(a)}
              disabled={a.disabled}
              className={cn(
                'h-9 text-xs',
                a.style === 'primary' && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
              )}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
