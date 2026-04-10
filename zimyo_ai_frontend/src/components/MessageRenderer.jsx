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
import ChatHandoff from './messages/ChatHandoff'
import Loading from './messages/Loading'
import StatsCards from './messages/StatsCards'
import SuccessBanner from './messages/SuccessBanner'
import ErrorCard from './messages/ErrorCard'
import Chips from './messages/Chips'

// Lazy imports — chart components (heavy, recharts ~400KB)
const BarChart = lazy(() => import('./messages/BarChart'))
const LineChart = lazy(() => import('./messages/LineChart'))
const PieChart = lazy(() => import('./messages/PieChart'))

const RENDERERS = {
  // Data display
  table:         DataTable,
  card:          Card,
  stats:         StatsCards,
  dashboard:     Dashboard,
  empty:         Empty,

  // Data input
  form:          Form,
  wizard:        Wizard,
  chips:         Chips,

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

  // System
  chat_handoff:  ChatHandoff,
  loading:       Loading,
}

// Chart types that need Suspense wrapper
const LAZY_TYPES = new Set(['chart_bar', 'chart_line', 'chart_pie'])

function ChartFallback() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full max-w-2xl mt-2 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-[200px] bg-gray-100 rounded-lg" />
    </div>
  )
}

export default function MessageRenderer({ msg, onAction }) {
  if (!msg || !msg.type) return null
  const Component = RENDERERS[msg.type]
  if (!Component) return null

  if (LAZY_TYPES.has(msg.type)) {
    return (
      <Suspense fallback={<ChartFallback />}>
        <Component msg={msg} onAction={onAction} />
      </Suspense>
    )
  }

  return <Component msg={msg} onAction={onAction} />
}
