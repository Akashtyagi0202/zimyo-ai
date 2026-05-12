/**
 * Form — renders ui.type === "form"
 *
 * Spec fields:
 *   title, subtitle?, icon?, alerts[], fieldGroups[], fields[], actions[]
 *
 * Field rendering lives in _FieldRenderer.jsx (shared with Wizard.jsx).
 */

import { useState } from 'react'
import { AlertCircle, Info, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FieldRenderer } from './_FieldRenderer'

const ALERT_STYLES = {
  info:    { bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200', icon: Info },
  warning: { bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200', icon: AlertTriangle },
  error:   { bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200', icon: AlertCircle },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200', icon: CheckCircle2 },
}

export default function Form({ msg, onAction }) {
  const { title, subtitle, alerts = [], fieldGroups = [], fields = [], actions = [] } = msg

  // Build initial values from defaults
  const initial = {}
  fields.forEach((f) => {
    if (f.hidden) return
    initial[f.id] = f.defaultValue ?? (f.type === 'toggle' || f.type === 'checkbox' ? false : '')
  })
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [collapsed, setCollapsed] = useState(() => {
    const c = {}
    fieldGroups.forEach((g) => {
      if (g.defaultCollapsed) c[g.id] = true
    })
    return c
  })

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
      if (val && f.validation) {
        if (f.validation.minLength && String(val).length < f.validation.minLength) {
          errs[f.id] = f.validation.errorMessage || `Minimum ${f.validation.minLength} characters`
        }
        if (f.validation.maxLength && String(val).length > f.validation.maxLength) {
          errs[f.id] = f.validation.errorMessage || `Maximum ${f.validation.maxLength} characters`
        }
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAction = (action) => {
    if (action.id === 'cancel' || action.style === 'ghost') {
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale shadow-sm">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1.5">
          {alerts.map((a) => {
            const s = ALERT_STYLES[a.type] || ALERT_STYLES.info
            const AlertIcon = s.icon
            return (
              <div key={a.id} className={cn('flex items-start gap-2 px-3 py-2 rounded-lg border text-xs', s.bg)}>
                <AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="flex-1">{a.message}</span>
              </div>
            )
          })}
        </div>
      )}

      {fieldGroups.map((group) => {
        const groupFields = fields.filter((f) => (group.fields || []).includes(f.id) && !f.hidden)
        const isCollapsed = collapsed[group.id]

        return (
          <div key={group.id} className="border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => group.collapsible && setCollapsed((c) => ({ ...c, [group.id]: !c[group.id] }))}
              className={cn(
                'w-full px-4 py-2.5 flex items-center justify-between text-left',
                group.collapsible && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40'
              )}
            >
              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{group.title}</span>
                {group.description && <p className="text-[10px] text-slate-400 dark:text-slate-500">{group.description}</p>}
              </div>
              {group.collapsible &&
                (isCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ))}
            </button>
            {!isCollapsed && (
              <div className="px-4 pb-3 grid grid-cols-24 gap-x-3 gap-y-2">
                {groupFields.map((f) => (
                  <FieldRenderer
                    key={f.id}
                    field={f}
                    value={values[f.id]}
                    error={errors[f.id]}
                    onChange={(v) => update(f.id, v)}
                    gridLayout
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {ungroupedFields.length > 0 && (
        <div className="px-4 pb-3 grid grid-cols-24 gap-x-3 gap-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          {ungroupedFields.map((f) => (
            <FieldRenderer
              key={f.id}
              field={f}
              value={values[f.id]}
              error={errors[f.id]}
              onChange={(v) => update(f.id, v)}
              gridLayout
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
              disabled={a.disabled || a.loading}
              className={cn(
                'h-9 text-xs',
                a.fullWidth && 'flex-1',
                a.style === 'primary' && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
              )}
            >
              {a.loading ? 'Loading…' : a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
