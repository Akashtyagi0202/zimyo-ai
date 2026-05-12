/**
 * MessageRenderer — master router for ALL structured UI types.
 *
 * Backend sends {type: "..."} → this picks the right component.
 * Naya type aaye = ek line add karo in RENDERERS.
 *
 * Charts are lazy-loaded to reduce initial bundle size.
 */

import { lazy, Suspense } from 'react'

// Eager imports — core components (small, always needed)
import DataTable from './messages/DataTable'
import Confirmation from './messages/Confirmation'
import Form from './messages/Form'
import Card from './messages/Card'
import Wizard from './messages/Wizard'
import Checklist from './messages/Checklist'
import Approval from './messages/Approval'
import Split from './messages/Split'
import Dashboard from './messages/Dashboard'
import Empty from './messages/Empty'
import Text from './messages/Text'
import ChatHandoff from './messages/ChatHandoff'
import Loading from './messages/Loading'
import StatsCards from './messages/StatsCards'
import SuccessBanner from './messages/SuccessBanner'
import ErrorCard from './messages/ErrorCard'
import Chips from './messages/Chips'
import PdfPreview from './messages/PdfPreview'

// Lazy imports — chart components (heavy, recharts ~400KB) + editor (TipTap ~120KB)
const BarChart = lazy(() => import('./messages/BarChart'))
const LineChart = lazy(() => import('./messages/LineChart'))
const PieChart = lazy(() => import('./messages/PieChart'))
const Editor = lazy(() => import('./messages/Editor'))

const RENDERERS = {
  // Data display
  table:         DataTable,
  card:          Card,
  stats:         StatsCards,
  dashboard:     Dashboard,
  empty:         Empty,
  text:          Text,

  // Data input
  form:          Form,
  wizard:        Wizard,
  chips:         Chips,
  editor:        Editor,

  // Workflow
  checklist:     Checklist,
  approval:      Approval,
  split:         Split,
  confirmation:  Confirmation,

  // Charts (lazy-loaded)
  chart_bar:     BarChart,
  chart_line:    LineChart,
  chart_pie:     PieChart,

  // Status
  success:       SuccessBanner,
  error:         ErrorCard,

  // Preview / hosted assets
  pdf:           PdfPreview,

  // System
  chat_handoff:  ChatHandoff,
  loading:       Loading,
}

// Types that need Suspense wrapper (lazy-loaded above)
const LAZY_TYPES = new Set(['chart_bar', 'chart_line', 'chart_pie', 'editor'])

function ChartFallback() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full max-w-2xl mt-2 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-[200px] bg-gray-100 rounded-lg" />
    </div>
  )
}

// Track which unknown types we've already warned about so the console
// doesn't flood when the same drift hits every message of a session.
const _warnedUnknownTypes = new Set()

function UnknownType({ type }) {
  if (import.meta.env.PROD) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800 mt-2 max-w-2xl">
      <strong>Unknown message type</strong>: <code>{String(type)}</code>
      <div className="text-amber-700 mt-1">
        Backend sent a <code>type</code> the frontend doesn't recognise. Add it
        to <code>RENDERERS</code> in <code>MessageRenderer.jsx</code>, or check
        the contract.
      </div>
    </div>
  )
}

export default function MessageRenderer({ msg, onAction }) {
  if (!msg || !msg.type) return null
  const Component = RENDERERS[msg.type]
  if (!Component) {
    if (!_warnedUnknownTypes.has(msg.type)) {
      _warnedUnknownTypes.add(msg.type)
      // eslint-disable-next-line no-console
      console.warn(
        `[MessageRenderer] Unknown msg.type=${JSON.stringify(msg.type)}; ` +
        `add a renderer or check the backend contract.`,
      )
    }
    return <UnknownType type={msg.type} />
  }

  // For Form/Wizard/Editor, key on the field-shape signature so a
  // ui_partial → final transition (which replaces the field set with
  // updated defaults but keeps the same msg.id) forces a remount and
  // re-seeds useState(initial). Without this, default-value updates
  // are silently dropped because useState only reads its initialiser
  // on the first mount.
  let key
  if (msg.type === 'form' || msg.type === 'wizard') {
    const fields = msg.fields || (msg.steps && msg.steps.flatMap(s => s.fields || [])) || []
    key = fields.map(f => `${f.id}:${typeof f.defaultValue}`).join('|') || undefined
  }

  if (LAZY_TYPES.has(msg.type)) {
    return (
      <Suspense fallback={<ChartFallback />}>
        <Component key={key} msg={msg} onAction={onAction} />
      </Suspense>
    )
  }

  return <Component key={key} msg={msg} onAction={onAction} />
}
