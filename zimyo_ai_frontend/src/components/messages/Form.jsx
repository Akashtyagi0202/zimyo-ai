/**
 * Form — renders ui.type === "form"
 *
 * Spec fields:
 *   title, subtitle?, icon?, alerts[], fieldGroups[], fields[], actions[]
 *
 * Field types: text, email, number, date, daterange, time, select, radio,
 *   checkbox, textarea, toggle, file, tags, phone, slider, rating, currency
 */

import { useState, lazy, Suspense } from 'react'
import { AlertCircle, Info, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react'

// Lazy — TipTap is ~120KB. Loaded only when a form actually renders an editor field.
const RichTextEditor = lazy(() => import('./_RichTextEditor'))

const ALERT_STYLES = {
  info: { bg: 'bg-blue-50 border-blue-200 text-blue-800', icon: Info },
  warning: { bg: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertTriangle },
  error: { bg: 'bg-red-50 border-red-200 text-red-800', icon: AlertCircle },
  success: { bg: 'bg-green-50 border-green-200 text-green-800', icon: CheckCircle2 },
}

const ACTION_STYLES = {
  primary: 'bg-zimyo-600 hover:bg-zimyo-700 text-white shadow-sm',
  ghost: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
}

export default function Form({ msg, onAction }) {
  const { title, subtitle, alerts = [], fieldGroups = [], fields = [], actions = [] } = msg

  // Build initial values from defaults
  const initial = {}
  fields.forEach(f => {
    if (f.hidden) return
    initial[f.id] = f.defaultValue ?? (f.type === 'toggle' || f.type === 'checkbox' ? false : '')
  })
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [collapsed, setCollapsed] = useState(() => {
    const c = {}
    fieldGroups.forEach(g => { if (g.defaultCollapsed) c[g.id] = true })
    return c
  })

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

  // Group fields or flat list
  const groupedFieldIds = new Set(fieldGroups.flatMap(g => g.fields || []))
  const ungroupedFields = fields.filter(f => !groupedFieldIds.has(f.id) && !f.hidden)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 pb-2 space-y-1.5">
          {alerts.map(a => {
            const s = ALERT_STYLES[a.type] || ALERT_STYLES.info
            const AlertIcon = s.icon
            return (
              <div key={a.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${s.bg}`}>
                <AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="flex-1">{a.message}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Field Groups */}
      {fieldGroups.map(group => {
        const groupFields = fields.filter(f => (group.fields || []).includes(f.id) && !f.hidden)
        const isCollapsed = collapsed[group.id]

        return (
          <div key={group.id} className="border-t border-gray-100">
            <button
              onClick={() => group.collapsible && setCollapsed(c => ({ ...c, [group.id]: !c[group.id] }))}
              className={`w-full px-4 py-2.5 flex items-center justify-between text-left ${group.collapsible ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            >
              <div>
                <span className="text-xs font-semibold text-gray-700">{group.title}</span>
                {group.description && <p className="text-[10px] text-gray-400">{group.description}</p>}
              </div>
              {group.collapsible && (isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />)}
            </button>
            {!isCollapsed && (
              <div className="px-4 pb-3 grid grid-cols-24 gap-x-3 gap-y-2">
                {groupFields.map(f => (
                  <FieldRenderer key={f.id} field={f} value={values[f.id]} error={errors[f.id]} onChange={v => update(f.id, v)} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Ungrouped fields */}
      {ungroupedFields.length > 0 && (
        <div className="px-4 pb-3 grid grid-cols-24 gap-x-3 gap-y-2 border-t border-gray-100 pt-3">
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
              disabled={a.disabled || a.loading}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97] disabled:opacity-50 ${
                a.fullWidth ? 'flex-1' : ''
              } ${ACTION_STYLES[a.style] || ACTION_STYLES.ghost}`}
            >
              {a.loading ? 'Loading...' : a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


function FieldRenderer({ field, value, error, onChange }) {
  const span = field.layout?.span || 24
  const colSpan = `col-span-${span === 12 ? '12' : '24'}`

  return (
    <div className={colSpan}>
      {field.type !== 'toggle' && field.type !== 'checkbox' && field.type !== 'divider' && (
        <label className="text-xs text-gray-600 mb-1 block">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <FieldInput field={field} value={value} onChange={onChange} />

      {field.hint && !error && <p className="text-[10px] text-gray-400 mt-0.5">{field.hint}</p>}
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}


function FieldInput({ field, value, onChange }) {
  const base = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-zimyo-400 focus:ring-1 focus:ring-zimyo-100 transition-all disabled:opacity-50 disabled:bg-gray-100"

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={field.disabled || field.readOnly}
          rows={3}
          className={`${base} resize-none`}
        />
      )

    case 'editor':
      return (
        <Suspense fallback={<div className="border border-gray-200 rounded-lg h-32 bg-gray-50 animate-pulse" />}>
          <RichTextEditor
            value={value || ''}
            onChange={onChange}
            config={{ minHeight: 180, ...(field.config || {}), readOnly: field.disabled || field.readOnly }}
          />
        </Suspense>
      )

    case 'select':
      return (
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={field.disabled}
          className={`${base} appearance-none cursor-pointer`}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {(field.options || []).map(opt => {
            const val = typeof opt === 'string' ? opt : opt.value
            const label = typeof opt === 'string' ? opt : opt.label
            const disabled = typeof opt === 'object' && opt.disabled
            return (
              <option key={val} value={val} disabled={disabled}>
                {label}{typeof opt === 'object' && opt.description ? ` — ${opt.description}` : ''}
              </option>
            )
          })}
        </select>
      )

    case 'radio':
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map(opt => {
            const val = typeof opt === 'string' ? opt : opt.value
            const label = typeof opt === 'string' ? opt : opt.label
            const isActive = value === val
            return (
              <button
                key={val}
                type="button"
                onClick={() => onChange(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-zimyo-50 border-zimyo-400 text-zimyo-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )

    case 'toggle':
    case 'checkbox':
      return (
        <div className="flex items-center gap-2.5 py-1">
          <div
            onClick={() => !field.disabled && onChange(!value)}
            className={`w-9 h-5 rounded-full cursor-pointer relative transition-colors ${
              value ? 'bg-zimyo-600' : 'bg-gray-300'
            } ${field.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-4' : 'left-0.5'}`} />
          </div>
          <span className="text-xs text-gray-700">{field.label}</span>
        </div>
      )

    case 'tags':
      return (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {(Array.isArray(value) ? value : []).map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zimyo-50 text-zimyo-700 rounded-md text-xs">
                {tag}
                <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => onChange(value.filter(t => t !== tag))} />
              </span>
            ))}
          </div>
          <select
            value=""
            onChange={e => {
              if (e.target.value && !(value || []).includes(e.target.value)) {
                onChange([...(value || []), e.target.value])
              }
            }}
            className={base}
          >
            <option value="">Add...</option>
            {(field.options || []).filter(o => {
              const v = typeof o === 'string' ? o : o.value
              return !(value || []).includes(v)
            }).map(opt => {
              const val = typeof opt === 'string' ? opt : opt.value
              const label = typeof opt === 'string' ? opt : opt.label
              return <option key={val} value={val}>{label}</option>
            })}
          </select>
        </div>
      )

    case 'file':
      return (
        <input
          type="file"
          accept={field.validation?.accept}
          disabled={field.disabled}
          onChange={e => onChange(e.target.files?.[0] || null)}
          className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      )

    case 'daterange':
      return (
        <div className="flex gap-2">
          <input
            type="date"
            value={value?.from || ''}
            onChange={e => onChange({ ...(value || {}), from: e.target.value })}
            min={field.validation?.min}
            max={field.validation?.max}
            className={base}
          />
          <span className="text-xs text-gray-400 self-center">to</span>
          <input
            type="date"
            value={value?.to || ''}
            onChange={e => onChange({ ...(value || {}), to: e.target.value })}
            min={value?.from || field.validation?.min}
            max={field.validation?.max}
            className={base}
          />
        </div>
      )

    case 'slider':
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={value || field.validation?.min || 0}
            onChange={e => onChange(Number(e.target.value))}
            min={field.validation?.min || 0}
            max={field.validation?.max || 100}
            className="flex-1 accent-zimyo-600"
          />
          <span className="text-xs font-medium text-gray-700 w-8 text-right">{value || 0}</span>
        </div>
      )

    case 'divider':
      return <hr className="border-gray-200 my-1" />

    case 'number':
    case 'currency':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={field.placeholder}
          disabled={field.disabled || field.readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
          className={base}
        />
      )

    // text, email, date, time, phone, url, otp — all use <input>
    default:
      return (
        <input
          type={field.type === 'phone' ? 'tel' : field.type || 'text'}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={field.disabled || field.readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
          className={base}
        />
      )
  }
}
