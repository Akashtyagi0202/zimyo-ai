/**
 * Shared form primitives for Settings sections — Toggle, Radio, Select.
 * Kept private to settings/ so they don't accidentally drift into chat UI.
 */

export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
        checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function Radio({ name, value, selected, onChange, label, hint, disabled }) {
  const picked = selected === value
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
        picked
          ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500/60 dark:bg-indigo-500/10'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={picked}
        onChange={() => onChange(value)}
        disabled={disabled}
        className="mt-1 accent-indigo-600"
      />
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>
      </div>
    </label>
  )
}

export function Select({ value, onChange, options, disabled, icon: Icon, label, emptyHint }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {Icon && <Icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />}
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
      >
        <option value="">NONE</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{emptyHint}</p>
      )}
    </div>
  )
}
