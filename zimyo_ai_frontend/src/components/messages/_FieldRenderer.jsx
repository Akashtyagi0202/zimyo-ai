/**
 * Shared FieldRenderer + FieldInput for Form.jsx and Wizard.jsx.
 *
 * Field types: text, email, number, date, daterange, time, select, radio,
 *   checkbox, textarea, toggle, file, tags, phone, slider, currency, editor,
 *   divider.
 *
 * Form uses a 24-column grid (gridLayout=true honors field.layout.span).
 * Wizard stacks vertically (gridLayout=false, the default).
 */

import { lazy, Suspense } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// TipTap is ~120KB — load only when an editor field actually renders.
const RichTextEditor = lazy(() => import('./_RichTextEditor'))

// Tailwind classes for the non-shadcn `<select>` so it visually matches Input.
const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer'

export function FieldRenderer({ field, value, error, onChange, gridLayout = false }) {
  const colSpan = gridLayout
    ? (field.layout?.span === 12 ? 'col-span-12' : 'col-span-24')
    : ''

  return (
    <div className={colSpan}>
      {field.type !== 'toggle' && field.type !== 'checkbox' && field.type !== 'divider' && (
        <label className="text-xs text-slate-600 dark:text-slate-300 mb-1 block">
          {field.label}
          {field.required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <FieldInput field={field} value={value} onChange={onChange} />

      {field.hint && !error && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{field.hint}</p>
      )}
      {error && <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5">{error}</p>}
    </div>
  )
}

export function FieldInput({ field, value, onChange }) {
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={field.disabled || field.readOnly}
          rows={3}
          className="resize-none"
        />
      )

    case 'editor':
      return (
        <Suspense fallback={<div className="border border-slate-200 dark:border-slate-700 rounded-lg h-32 bg-slate-50 dark:bg-slate-800/60 animate-pulse" />}>
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
          onChange={(e) => onChange(e.target.value)}
          disabled={field.disabled}
          className={SELECT_CLASS}
        >
          <option value="">{field.placeholder || 'Select…'}</option>
          {(field.options || []).map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value
            const label = typeof opt === 'string' ? opt : opt.label
            const disabled = typeof opt === 'object' && opt.disabled
            return (
              <option key={val} value={val} disabled={disabled}>
                {label}
                {typeof opt === 'object' && opt.description ? ` — ${opt.description}` : ''}
              </option>
            )
          })}
        </select>
      )

    case 'radio':
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value
            const label = typeof opt === 'string' ? opt : opt.label
            const isActive = value === val
            return (
              <button
                key={val}
                type="button"
                onClick={() => onChange(val)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-400 dark:border-indigo-500/60 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                )}
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
            className={cn(
              'w-9 h-5 rounded-full cursor-pointer relative transition-colors',
              value ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600',
              field.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                value ? 'left-4' : 'left-0.5'
              )}
            />
          </div>
          <span className="text-xs text-slate-700 dark:text-slate-200">{field.label}</span>
        </div>
      )

    case 'tags':
      return (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {(Array.isArray(value) ? value : []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-md text-xs"
              >
                {tag}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-rose-500"
                  onClick={() => onChange(value.filter((t) => t !== tag))}
                />
              </span>
            ))}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !(value || []).includes(e.target.value)) {
                onChange([...(value || []), e.target.value])
              }
            }}
            className={SELECT_CLASS}
          >
            <option value="">Add…</option>
            {(field.options || [])
              .filter((o) => {
                const v = typeof o === 'string' ? o : o.value
                return !(value || []).includes(v)
              })
              .map((opt) => {
                const val = typeof opt === 'string' ? opt : opt.value
                const label = typeof opt === 'string' ? opt : opt.label
                return (
                  <option key={val} value={val}>
                    {label}
                  </option>
                )
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
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700"
        />
      )

    case 'daterange':
      return (
        <div className="flex gap-2 items-center">
          <Input
            type="date"
            value={value?.from || ''}
            onChange={(e) => onChange({ ...(value || {}), from: e.target.value })}
            min={field.validation?.min}
            max={field.validation?.max}
          />
          <span className="text-xs text-slate-400 dark:text-slate-500">to</span>
          <Input
            type="date"
            value={value?.to || ''}
            onChange={(e) => onChange({ ...(value || {}), to: e.target.value })}
            min={value?.from || field.validation?.min}
            max={field.validation?.max}
          />
        </div>
      )

    case 'slider':
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={value || field.validation?.min || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            min={field.validation?.min || 0}
            max={field.validation?.max || 100}
            className="flex-1 accent-indigo-600"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 w-8 text-right tabular-nums">
            {value || 0}
          </span>
        </div>
      )

    case 'divider':
      return <hr className="border-slate-200 dark:border-slate-700 my-1" />

    case 'number':
    case 'currency':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={field.placeholder}
          disabled={field.disabled || field.readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      )

    // text, email, date, time, phone, url, otp — all use Input
    default:
      return (
        <Input
          type={field.type === 'phone' ? 'tel' : field.type || 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={field.disabled || field.readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      )
  }
}
