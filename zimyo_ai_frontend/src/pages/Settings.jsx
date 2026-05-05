import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarRange,
  Briefcase,
  Gift,
  Mail,
  Users,
  FileText,
  GitBranch,
  UserPlus,
  Building2,
  MapPin,
  IdCard,
} from 'lucide-react'
import {
  getCtcDefaults,
  saveCtcDefaults,
  getCtcDefaultsOptions,
  getOfferLetterDefaults,
  saveOfferLetterDefaults,
  getOfferLetterDefaultsOptions,
  getCandidateDefaults,
  saveCandidateDefaults,
  getCandidateDefaultsOptions,
  getWorkflow,
  saveWorkflow,
  getWorkflowOptions,
} from '../api/client'

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

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-zimyo-600' : 'bg-gray-300 dark:bg-gray-600'
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

function Radio({ name, value, selected, onChange, label, hint, disabled }) {
  const picked = selected === value
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
        picked
          ? 'border-zimyo-400 bg-zimyo-50 dark:border-zimyo-500/60 dark:bg-zimyo-900/30'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={picked}
        onChange={() => onChange(value)}
        disabled={disabled}
        className="mt-1 accent-zimyo-600"
      />
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>
      </div>
    </label>
  )
}

function Select({ value, onChange, options, disabled, icon: Icon, label, emptyHint }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {Icon && <Icon className="w-4 h-4 text-indigo-500" />}
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-zimyo-500/50"
      >
        <option value="">NONE</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="text-xs text-gray-400 mt-1">{emptyHint}</p>
      )}
    </div>
  )
}

export default function Settings({ user }) {
  const navigate = useNavigate()
  const [values, setValues] = useState({
    esic_enabled: 0,
    pf_enabled: 0,
    lwf_enabled: 0,
    pt_enabled: 0,
    applicable_from_strategy: '',
    ot_plan_id: '',
    ot_plan_name: '',
    bonus_plan_id: '',
    bonus_plan_name: '',
  })
  const [options, setOptions] = useState({ ot_plans: [], bonus_plans: [] })
  const [olValues, setOlValues] = useState({
    default_template_id: '',
    default_template_name: '',
    default_cc: [],
  })
  const [olCcInput, setOlCcInput] = useState('')
  const [olOptions, setOlOptions] = useState({ templates: [] })
  const [candValues, setCandValues] = useState({
    default_designation_id:   '',
    default_designation_name: '',
    default_department_id:    '',
    default_department_name:  '',
    default_location_id:      '',
    default_location_name:    '',
    default_entity_id:        '',
    default_entity_name:      '',
    default_age:              '',
    default_ctc:              '',
    joining_date_offset_days: 0,
  })
  const [candOptions, setCandOptions] = useState({
    designation: [], department: [], location: [], entity: [],
  })
  const [wfValues, setWfValues] = useState({ id: '', name: '' })
  const [wfOptions, setWfOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      getCtcDefaults(user.userId),
      getCtcDefaultsOptions(user.userId).catch(() => ({ ot_plans: [], bonus_plans: [] })),
      getOfferLetterDefaults(user.userId).catch(() => ({
        default_template_id: '', default_template_name: '', default_cc: [],
      })),
      getOfferLetterDefaultsOptions(user.userId).catch(() => ({ templates: [] })),
      getCandidateDefaults(user.userId).catch(() => ({})),
      getCandidateDefaultsOptions(user.userId).catch(() => ({
        designation: [], department: [], location: [], entity: [],
      })),
      getWorkflow(user.userId).catch(() => ({ id: '', name: '' })),
      getWorkflowOptions(user.userId).catch(() => ({ workflows: [] })),
    ])
      .then(([doc, opts, olDoc, olOpts, candDoc, candOpts, wfDoc, wfOpts]) => {
        if (cancelled) return
        setValues({
          esic_enabled: doc.esic_enabled ? 1 : 0,
          pf_enabled:   doc.pf_enabled   ? 1 : 0,
          lwf_enabled:  doc.lwf_enabled  ? 1 : 0,
          pt_enabled:   doc.pt_enabled   ? 1 : 0,
          applicable_from_strategy: doc.applicable_from_strategy || '',
          ot_plan_id:      String(doc.ot_plan_id || ''),
          ot_plan_name:    String(doc.ot_plan_name || ''),
          bonus_plan_id:   String(doc.bonus_plan_id || ''),
          bonus_plan_name: String(doc.bonus_plan_name || ''),
        })
        setOptions({
          ot_plans: opts?.ot_plans || [],
          bonus_plans: opts?.bonus_plans || [],
        })
        const ccArr = Array.isArray(olDoc?.default_cc) ? olDoc.default_cc : []
        setOlValues({
          default_template_id:   String(olDoc?.default_template_id || ''),
          default_template_name: String(olDoc?.default_template_name || ''),
          default_cc:            ccArr,
        })
        setOlCcInput(ccArr.join(', '))
        setOlOptions({ templates: olOpts?.templates || [] })
        setCandValues({
          default_designation_id:   String(candDoc?.default_designation_id || ''),
          default_designation_name: String(candDoc?.default_designation_name || ''),
          default_department_id:    String(candDoc?.default_department_id || ''),
          default_department_name:  String(candDoc?.default_department_name || ''),
          default_location_id:      String(candDoc?.default_location_id || ''),
          default_location_name:    String(candDoc?.default_location_name || ''),
          default_entity_id:        String(candDoc?.default_entity_id || ''),
          default_entity_name:      String(candDoc?.default_entity_name || ''),
          default_age:              String(candDoc?.default_age || ''),
          default_ctc:              String(candDoc?.default_ctc || ''),
          joining_date_offset_days: Number(candDoc?.joining_date_offset_days || 0),
        })
        setCandOptions({
          designation: candOpts?.designation || [],
          department:  candOpts?.department  || [],
          location:    candOpts?.location    || [],
          entity:      candOpts?.entity      || [],
        })
        setWfValues({
          id:   String(wfDoc?.id || ''),
          name: String(wfDoc?.name || ''),
        })
        setWfOptions(wfOpts?.workflows || [])
      })
      .catch((e) => {
        if (cancelled) return
        setFeedback({ kind: 'err', text: e.message || 'Failed to load defaults' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.userId])

  const toggle = (key) => (v) => {
    setValues((prev) => ({ ...prev, [key]: v ? 1 : 0 }))
    setFeedback(null)
  }

  const pickStrategy = (v) => {
    setValues((prev) => ({ ...prev, applicable_from_strategy: v }))
    setFeedback(null)
  }

  const pickPlan = (field, list) => (id) => {
    const plan = list.find((p) => String(p.id) === String(id))
    setValues((prev) => ({
      ...prev,
      [`${field}_id`]:   id || '',
      [`${field}_name`]: plan?.name || '',
    }))
    setFeedback(null)
  }

  const pickWorkflow = (id) => {
    const wf = wfOptions.find((w) => String(w.id) === String(id))
    setWfValues({ id: id || '', name: wf?.name || '' })
    setFeedback(null)
  }

  const pickOlTemplate = (id) => {
    const tpl = olOptions.templates.find((t) => String(t.id) === String(id))
    setOlValues((prev) => ({
      ...prev,
      default_template_id:   id || '',
      default_template_name: tpl?.name || '',
    }))
    setFeedback(null)
  }

  const onOlCcInputChange = (raw) => {
    setOlCcInput(raw)
    // Parse on blur/save — don't thrash state on every keystroke.
    setFeedback(null)
  }

  // Generic candidate-defaults dropdown picker — covers all 4 dropdowns
  // (designation / department / location / entity) since each follows the
  // same {id, name} → {default_<field>_id, default_<field>_name} mapping.
  const pickCandDropdown = (field) => (id) => {
    const opt = (candOptions[field] || []).find((o) => String(o.id) === String(id))
    setCandValues((prev) => ({
      ...prev,
      [`default_${field}_id`]:   id || '',
      [`default_${field}_name`]: opt?.name || '',
    }))
    setFeedback(null)
  }

  const onCandTextChange = (key) => (e) => {
    setCandValues((prev) => ({ ...prev, [key]: e.target.value }))
    setFeedback(null)
  }

  const parseCcList = (raw) => {
    const seen = new Set()
    const out = []
    for (const p of String(raw || '').split(',')) {
      const e = p.trim()
      if (e && !seen.has(e.toLowerCase())) {
        seen.add(e.toLowerCase())
        out.push(e)
      }
    }
    return out
  }

  const handleSave = async () => {
    if (!user?.userId) return
    setSaving(true)
    setFeedback(null)
    const ccList = parseCcList(olCcInput)
    try {
      const tasks = [
        saveCtcDefaults(user.userId, values),
        saveOfferLetterDefaults(user.userId, {
          default_template_id:   olValues.default_template_id,
          default_template_name: olValues.default_template_name,
          default_cc:            ccList,
        }),
        saveCandidateDefaults(user.userId, {
          ...candValues,
          default_designation_id:   candValues.default_designation_id ? Number(candValues.default_designation_id) : null,
          default_department_id:    candValues.default_department_id  ? Number(candValues.default_department_id)  : null,
          default_location_id:      candValues.default_location_id    ? Number(candValues.default_location_id)    : null,
          default_entity_id:        candValues.default_entity_id      ? Number(candValues.default_entity_id)      : null,
          joining_date_offset_days: Number(candValues.joining_date_offset_days || 0),
        }),
      ]
      // Only persist workflow if one is selected — empty id is a no-op (keeps Redis as-is).
      if (wfValues.id) {
        tasks.push(saveWorkflow(user.userId, { id: wfValues.id, name: wfValues.name }))
      }
      const [saved, olSaved, candSaved, wfSaved] = await Promise.all(tasks)
      setValues({
        esic_enabled: saved.esic_enabled ? 1 : 0,
        pf_enabled:   saved.pf_enabled   ? 1 : 0,
        lwf_enabled:  saved.lwf_enabled  ? 1 : 0,
        pt_enabled:   saved.pt_enabled   ? 1 : 0,
        applicable_from_strategy: saved.applicable_from_strategy || '',
        ot_plan_id:      String(saved.ot_plan_id || ''),
        ot_plan_name:    String(saved.ot_plan_name || ''),
        bonus_plan_id:   String(saved.bonus_plan_id || ''),
        bonus_plan_name: String(saved.bonus_plan_name || ''),
      })
      const savedCc = Array.isArray(olSaved?.default_cc) ? olSaved.default_cc : []
      setOlValues({
        default_template_id:   String(olSaved?.default_template_id || ''),
        default_template_name: String(olSaved?.default_template_name || ''),
        default_cc:            savedCc,
      })
      setOlCcInput(savedCc.join(', '))
      if (candSaved) {
        setCandValues({
          default_designation_id:   String(candSaved.default_designation_id || ''),
          default_designation_name: String(candSaved.default_designation_name || ''),
          default_department_id:    String(candSaved.default_department_id || ''),
          default_department_name:  String(candSaved.default_department_name || ''),
          default_location_id:      String(candSaved.default_location_id || ''),
          default_location_name:    String(candSaved.default_location_name || ''),
          default_entity_id:        String(candSaved.default_entity_id || ''),
          default_entity_name:      String(candSaved.default_entity_name || ''),
          default_age:              String(candSaved.default_age || ''),
          default_ctc:              String(candSaved.default_ctc || ''),
          joining_date_offset_days: Number(candSaved.joining_date_offset_days || 0),
        })
      }
      if (wfSaved && wfSaved.id) {
        setWfValues({ id: String(wfSaved.id), name: String(wfSaved.name || '') })
      }
      setFeedback({ kind: 'ok', text: 'Defaults saved. They will apply to your next CTC, offer-letter, and add-candidate flows.' })
    } catch (e) {
      setFeedback({ kind: 'err', text: e.message || 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 bg-grid">
      {/* Header */}
      <header className="glass border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/agents')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-all"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-600/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Settings</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Agent defaults for your account</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.userId}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-10 pb-24">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zimyo-50 dark:bg-zimyo-900/30 border border-zimyo-200 dark:border-zimyo-700/40 rounded-full text-xs font-medium text-zimyo-600 dark:text-zimyo-300 mb-3">
            <GitBranch className="w-3.5 h-3.5" />
            Active onboarding workflow
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workflow selection</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            All onboarding flows (candidate list, details, CTC, offer letter) run against this workflow.
            You can also change it from chat by picking a workflow when the agent asks.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading your settings…
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active workflow */}
            <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active workflow</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {wfValues.id
                      ? <>Currently running against <strong className="text-gray-700 dark:text-gray-200">{wfValues.name || `Workflow ${wfValues.id}`}</strong>.</>
                      : 'No workflow saved yet — the agent will ask you once on the first onboarding query.'}
                  </p>
                </div>
              </div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Pick workflow
              </label>
              <select
                value={wfValues.id}
                onChange={(e) => pickWorkflow(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-zimyo-500/50"
              >
                <option value="">— Select a workflow —</option>
                {wfOptions.map((w) => (
                  <option key={w.id} value={w.id}>{w.name || `Workflow ${w.id}`}</option>
                ))}
              </select>
              {wfOptions.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  No workflows returned by Zimyo. Check if your admin has any configured under Onboarding.
                </p>
              )}
            </section>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zimyo-50 dark:bg-zimyo-900/30 border border-zimyo-200 dark:border-zimyo-700/40 rounded-full text-xs font-medium text-zimyo-600 dark:text-zimyo-300 mb-3">
                <SettingsIcon className="w-3.5 h-3.5" />
                CTC compute defaults
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your saved defaults</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                These apply automatically when you run "compute CTC". Override any of them for a single
                computation via <em>Edit options</em> on the review card.
              </p>
            </div>

            {/* Applicable-from strategy */}
            <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <CalendarRange className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Applicable-from month</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
                    selected={values.applicable_from_strategy}
                    onChange={pickStrategy}
                    label={o.label}
                    hint={o.hint}
                    disabled={saving}
                  />
                ))}
              </div>
            </section>

            {/* Compliance toggles */}
            <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              <div className="flex items-start gap-3 p-6 pb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Compliance toggles</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Applied silently on every CTC run. Override on the review card if needed.
                  </p>
                </div>
              </div>
              {TOGGLES.map((t) => (
                <div key={t.key} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.hint}</p>
                  </div>
                  <Toggle checked={!!values[t.key]} onChange={toggle(t.key)} disabled={saving} />
                </div>
              ))}
            </section>

            {/* OT + Bonus plans */}
            <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Default plans</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    OT and Bonus plans to pre-select. Options come from a sample candidate's payroll filters.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <Select
                  icon={Briefcase}
                  label="Overtime plan"
                  value={values.ot_plan_id}
                  onChange={pickPlan('ot_plan', options.ot_plans)}
                  options={options.ot_plans}
                  disabled={saving}
                  emptyHint="No OT plans available — run a CTC compute first so I can pick up your org's plans."
                />
                <Select
                  icon={Gift}
                  label="Bonus plan"
                  value={values.bonus_plan_id}
                  onChange={pickPlan('bonus_plan', options.bonus_plans)}
                  options={options.bonus_plans}
                  disabled={saving}
                  emptyHint="No Bonus plans available — run a CTC compute first so I can pick up your org's plans."
                />
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ADD-CANDIDATE DEFAULTS                                */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zimyo-50 dark:bg-zimyo-900/30 border border-zimyo-200 dark:border-zimyo-700/40 rounded-full text-xs font-medium text-zimyo-600 dark:text-zimyo-300 mb-3">
                <UserPlus className="w-3.5 h-3.5" />
                Add candidate defaults
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Auto-fill on candidate creation</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                These apply when you say "add candidate &lt;name&gt;, &lt;email&gt;". Override any field
                inline by mentioning it ("…, designation product manager, ctc 12 lakh").
              </p>
            </div>

            {/* Designation / Department / Location / Entity */}
            <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Org placement</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    The 4 mandatory dropdowns Zimyo's joinee form requires. Sourced live from your workspace.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  icon={Briefcase}
                  label="Designation"
                  value={candValues.default_designation_id}
                  onChange={pickCandDropdown('designation')}
                  options={candOptions.designation}
                  disabled={saving}
                  emptyHint="No designations available — check workspace setup."
                />
                <Select
                  icon={Building2}
                  label="Department"
                  value={candValues.default_department_id}
                  onChange={pickCandDropdown('department')}
                  options={candOptions.department}
                  disabled={saving}
                  emptyHint="No departments available."
                />
                <Select
                  icon={MapPin}
                  label="Location"
                  value={candValues.default_location_id}
                  onChange={pickCandDropdown('location')}
                  options={candOptions.location}
                  disabled={saving}
                  emptyHint="No locations available."
                />
                <Select
                  icon={IdCard}
                  label="Entity"
                  value={candValues.default_entity_id}
                  onChange={pickCandDropdown('entity')}
                  options={candOptions.entity}
                  disabled={saving}
                  emptyHint="No entities available."
                />
              </div>
            </section>

            {/* Default age / CTC / joining offset */}
            <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <CalendarRange className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Numeric defaults</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Joining date is computed as today + offset days; admin can override per-candidate.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Age
                  </label>
                  <input
                    type="text"
                    value={candValues.default_age}
                    onChange={onCandTextChange('default_age')}
                    disabled={saving}
                    placeholder="25"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-zimyo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Annual CTC (₹)
                  </label>
                  <input
                    type="text"
                    value={candValues.default_ctc}
                    onChange={onCandTextChange('default_ctc')}
                    disabled={saving}
                    placeholder="500000"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-zimyo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Joining offset (days)
                  </label>
                  <input
                    type="number"
                    value={candValues.joining_date_offset_days}
                    onChange={onCandTextChange('joining_date_offset_days')}
                    disabled={saving}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-zimyo-500/50"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    0 = today, 7 = today+7d, etc.
                  </p>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* OFFER LETTER DEFAULTS                                 */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zimyo-50 dark:bg-zimyo-900/30 border border-zimyo-200 dark:border-zimyo-700/40 rounded-full text-xs font-medium text-zimyo-600 dark:text-zimyo-300 mb-3">
                <Mail className="w-3.5 h-3.5" />
                Offer letter defaults
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your saved defaults</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                These apply automatically when you run "send offer letter". Override any of them for a single
                send on the editor / CC step.
              </p>
            </div>

            {/* Default template */}
            <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Default offer template</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    When set, I'll skip the template chip pick and open the editor with this template pre-loaded.
                  </p>
                </div>
              </div>
              <Select
                icon={FileText}
                label="Offer template"
                value={olValues.default_template_id}
                onChange={pickOlTemplate}
                options={olOptions.templates}
                disabled={saving}
                emptyHint="No offer templates available — configure one under Onboarding → Templates first."
              />
            </section>

            {/* Default CC recipients */}
            <section className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Default CC recipients</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    These emails get pre-selected in the CC step on every send. Comma-separated.
                  </p>
                </div>
              </div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                CC emails
              </label>
              <textarea
                value={olCcInput}
                onChange={(e) => onOlCcInputChange(e.target.value)}
                onBlur={(e) => setOlCcInput(parseCcList(e.target.value).join(', '))}
                disabled={saving}
                rows={2}
                placeholder="hr@zimyo.com, manager@zimyo.com"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-zimyo-500/50 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Tip: duplicates (case-insensitive) are removed on save.
              </p>
            </section>

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

      {/* Sticky save bar */}
      <div className="fixed bottom-0 inset-x-0 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-end gap-3">
          <button
            onClick={() => navigate('/agents')}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-zimyo-600 hover:bg-zimyo-700 disabled:bg-zimyo-400 disabled:cursor-not-allowed text-white rounded-xl shadow-sm shadow-zimyo-600/20 transition-all active:scale-[0.98]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save defaults'}
          </button>
        </div>
      </div>
    </div>
  )
}
