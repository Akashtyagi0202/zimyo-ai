/**
 * Wizard — renders ui.type === "wizard"
 *
 * Multi-step form with step navigation bar, progress, field rendering.
 * Reuses same FieldInput patterns as Form.jsx.
 *
 * Spec fields:
 *   title, subtitle?, step, totalSteps, steps[], progress{},
 *   navigation?, collectedData?, alerts[], fieldGroups[], fields[], actions[]
 */

import { useState } from 'react'
import { Check, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react'

const STEP_STATUS = {
  completed: { bg: 'bg-green-500', text: 'text-white', ring: '' },
  active: { bg: 'bg-zimyo-600', text: 'text-white', ring: 'ring-2 ring-zimyo-200' },
  upcoming: { bg: 'bg-gray-200', text: 'text-gray-500', ring: '' },
  error: { bg: 'bg-red-500', text: 'text-white', ring: '' },
  skipped: { bg: 'bg-gray-300', text: 'text-gray-500', ring: '' },
}

const ACTION_STYLES = {
  primary: 'bg-zimyo-600 hover:bg-zimyo-700 text-white shadow-sm',
  ghost: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
}

export default function Wizard({ msg, onAction }) {
  const { title, subtitle, steps = [], progress, navigation, alerts = [], fields = [], fieldGroups = [], actions = [] } = msg

  const initial = {}
  fields.forEach(f => {
    if (f.hidden) return
    initial[f.id] = f.defaultValue ?? (f.type === 'toggle' || f.type === 'checkbox' ? false : '')
  })
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})

  const update = (id, val) => {
    setValues(v => ({ ...v, [id]: val }))
    setErrors(e => ({ ...e, [id]: undefined }))
  }

  const validate = () => {
    const errs = {}
    fields.forEach(f => {
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

  const groupedFieldIds = new Set(fieldGroups.flatMap(g => g.fields || []))
  const ungroupedFields = fields.filter(f => !groupedFieldIds.has(f.id) && !f.hidden)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-lg mt-2 animate-fade-in-scale">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Steps bar */}
      {steps.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1">
            {steps.map((s, i) => {
              const cfg = STEP_STATUS[s.status] || STEP_STATUS.upcoming
              return (
                <div key={s.step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
                      {s.status === 'completed' ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span className={`text-[9px] mt-1 text-center truncate w-full ${s.status === 'active' ? 'text-zimyo-600 font-semibold' : 'text-gray-400'}`}>
                      {s.title}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 rounded ${s.status === 'completed' ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {progress && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">{progress.label}</span>
            <span className="text-[10px] font-semibold text-zimyo-600">{progress.percent}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-zimyo-600 rounded-full transition-all duration-500" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {alerts.map(a => (
            <div key={a.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
              a.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              a.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Field Groups */}
      {fieldGroups.map(group => {
        const gFields = fields.filter(f => (group.fields || []).includes(f.id) && !f.hidden)
        return (
          <div key={group.id} className="border-t border-gray-100">
            <div className="px-4 py-2">
              <span className="text-xs font-semibold text-gray-700">{group.title}</span>
              {group.description && <p className="text-[10px] text-gray-400">{group.description}</p>}
            </div>
            <div className="px-4 pb-3 space-y-2">
              {gFields.map(f => (
                <FieldRenderer key={f.id} field={f} value={values[f.id]} error={errors[f.id]} onChange={v => update(f.id, v)} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Ungrouped fields */}
      {ungroupedFields.length > 0 && (
        <div className="px-4 pb-3 space-y-2 border-t border-gray-100 pt-3">
          {ungroupedFields.map(f => (
            <FieldRenderer key={f.id} field={f} value={values[f.id]} error={errors[f.id]} onChange={v => update(f.id, v)} />
          ))}
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-gray-100">
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => handleAction(a)}
              disabled={a.disabled}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-50 ${ACTION_STYLES[a.style] || ACTION_STYLES.ghost}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FieldRenderer({ field, value, error, onChange }) {
  const base = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-zimyo-400 focus:ring-1 focus:ring-zimyo-100 transition-all disabled:opacity-50"

  return (
    <div>
      {field.type !== 'toggle' && field.type !== 'checkbox' && field.type !== 'divider' && (
        <label className="text-xs text-gray-600 mb-1 block">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {field.type === 'select' ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={field.disabled} className={`${base} appearance-none cursor-pointer`}>
          <option value="">{field.placeholder || 'Select...'}</option>
          {(field.options || []).map(o => {
            const v = typeof o === 'string' ? o : o.value
            const l = typeof o === 'string' ? o : o.label
            return <option key={v} value={v}>{l}</option>
          })}
        </select>
      ) : field.type === 'radio' ? (
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map(o => {
            const v = typeof o === 'string' ? o : o.value
            const l = typeof o === 'string' ? o : o.label
            return (
              <button key={v} type="button" onClick={() => onChange(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${value === v ? 'bg-zimyo-50 border-zimyo-400 text-zimyo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {l}
              </button>
            )
          })}
        </div>
      ) : field.type === 'toggle' || field.type === 'checkbox' ? (
        <div className="flex items-center gap-2.5 py-1">
          <div onClick={() => !field.disabled && onChange(!value)}
            className={`w-9 h-5 rounded-full cursor-pointer relative transition-colors ${value ? 'bg-zimyo-600' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-4' : 'left-0.5'}`} />
          </div>
          <span className="text-xs text-gray-700">{field.label}</span>
        </div>
      ) : field.type === 'textarea' ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} disabled={field.disabled} rows={3} className={`${base} resize-none`} />
      ) : field.type === 'file' ? (
        <input type="file" accept={field.validation?.accept} onChange={e => onChange(e.target.files?.[0])} className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700" />
      ) : (
        <input type={field.type === 'phone' ? 'tel' : field.type || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} disabled={field.disabled} min={field.validation?.min} max={field.validation?.max} className={base} />
      )}

      {field.hint && !error && <p className="text-[10px] text-gray-400 mt-0.5">{field.hint}</p>}
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
