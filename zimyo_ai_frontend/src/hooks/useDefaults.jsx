import { useEffect, useState } from 'react'
import {
  getCtcDefaults,
  saveCtcDefaults,
  getCtcDefaultsOptions,
  getOfferLetterDefaults,
  saveOfferLetterDefaults,
  getOfferLetterDefaultsOptions,
  getWorkflow,
  saveWorkflow,
  getWorkflowOptions,
} from '../api/client'

const EMPTY_CTC = {
  esic_enabled: 0,
  pf_enabled: 0,
  lwf_enabled: 0,
  pt_enabled: 0,
  applicable_from_strategy: '',
  ot_plan_id: '',
  ot_plan_name: '',
  bonus_plan_id: '',
  bonus_plan_name: '',
}

const EMPTY_OL = {
  default_template_id: '',
  default_template_name: '',
  default_cc: [],
}

const normalizeCtc = (doc) => ({
  esic_enabled: doc?.esic_enabled ? 1 : 0,
  pf_enabled:   doc?.pf_enabled   ? 1 : 0,
  lwf_enabled:  doc?.lwf_enabled  ? 1 : 0,
  pt_enabled:   doc?.pt_enabled   ? 1 : 0,
  applicable_from_strategy: doc?.applicable_from_strategy || '',
  ot_plan_id:      String(doc?.ot_plan_id || ''),
  ot_plan_name:    String(doc?.ot_plan_name || ''),
  bonus_plan_id:   String(doc?.bonus_plan_id || ''),
  bonus_plan_name: String(doc?.bonus_plan_name || ''),
})

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

/**
 * Loads CTC + offer-letter + workflow defaults (and their option catalogs) in
 * parallel, exposes per-section state slices, and provides a single `save()`
 * that persists everything in one shot. Workflow is only saved when an id is
 * actually selected (empty == no-op so we don't clobber Redis).
 */
export default function useDefaults(userId) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [ctc, setCtc] = useState(EMPTY_CTC)
  const [ctcOptions, setCtcOptions] = useState({ ot_plans: [], bonus_plans: [] })

  const [ol, setOl] = useState(EMPTY_OL)
  const [olCcInput, setOlCcInput] = useState('')
  const [olOptions, setOlOptions] = useState({ templates: [] })

  const [wf, setWf] = useState({ id: '', name: '' })
  const [wfOptions, setWfOptions] = useState([])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      getCtcDefaults(userId),
      getCtcDefaultsOptions(userId).catch(() => ({ ot_plans: [], bonus_plans: [] })),
      getOfferLetterDefaults(userId).catch(() => EMPTY_OL),
      getOfferLetterDefaultsOptions(userId).catch(() => ({ templates: [] })),
      getWorkflow(userId).catch(() => ({ id: '', name: '' })),
      getWorkflowOptions(userId).catch(() => ({ workflows: [] })),
    ])
      .then(([doc, opts, olDoc, olOpts, wfDoc, wfOpts]) => {
        if (cancelled) return
        setCtc(normalizeCtc(doc))
        setCtcOptions({
          ot_plans: opts?.ot_plans || [],
          bonus_plans: opts?.bonus_plans || [],
        })
        const ccArr = Array.isArray(olDoc?.default_cc) ? olDoc.default_cc : []
        setOl({
          default_template_id:   String(olDoc?.default_template_id || ''),
          default_template_name: String(olDoc?.default_template_name || ''),
          default_cc:            ccArr,
        })
        setOlCcInput(ccArr.join(', '))
        setOlOptions({ templates: olOpts?.templates || [] })
        setWf({
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
  }, [userId])

  const save = async () => {
    if (!userId) return
    setSaving(true)
    setFeedback(null)
    const ccList = parseCcList(olCcInput)
    try {
      const tasks = [
        saveCtcDefaults(userId, ctc),
        saveOfferLetterDefaults(userId, {
          default_template_id:   ol.default_template_id,
          default_template_name: ol.default_template_name,
          default_cc:            ccList,
        }),
      ]
      // Empty workflow id = leave Redis as-is (no-op).
      if (wf.id) tasks.push(saveWorkflow(userId, { id: wf.id, name: wf.name }))
      const [savedCtc, savedOl, savedWf] = await Promise.all(tasks)
      setCtc(normalizeCtc(savedCtc))
      const savedCc = Array.isArray(savedOl?.default_cc) ? savedOl.default_cc : []
      setOl({
        default_template_id:   String(savedOl?.default_template_id || ''),
        default_template_name: String(savedOl?.default_template_name || ''),
        default_cc:            savedCc,
      })
      setOlCcInput(savedCc.join(', '))
      if (savedWf && savedWf.id) {
        setWf({ id: String(savedWf.id), name: String(savedWf.name || '') })
      }
      setFeedback({
        kind: 'ok',
        text: 'Defaults saved. They will apply to your next CTC and offer-letter flows.',
      })
    } catch (e) {
      setFeedback({ kind: 'err', text: e.message || 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  return {
    loading, saving,
    feedback, setFeedback,
    ctc, setCtc, ctcOptions,
    ol, setOl, olCcInput, setOlCcInput, olOptions,
    wf, setWf, wfOptions,
    save,
    parseCcList,
  }
}
