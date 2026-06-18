/**
 * TracePanel — collapsible per-event debug view.
 *
 * Backend emits SSE `trace` events only when `TRACE=true` is set in
 * its env. Chat.jsx accumulates them on the streaming bubble; this
 * component renders the list. Default-collapsed at the panel level;
 * each event is also independently expandable for full payloads.
 *
 * Each trace event carries `{kind, ...}`:
 *   - kind="node"             — LangGraph node tick {node, output, duration_ms}
 *   - kind="mcp_call"         — outgoing MCP tool call {tool, args}
 *   - kind="mcp_result"       — MCP tool response   {tool, status, result, duration_ms}
 *   - kind="python_engine"    — sandbox run started {code, input_keys, input_size, caller}
 *   - kind="python_engine_result" — sandbox finished {status, output|error, duration_ms}
 *
 * Renders nothing when `traces` is empty / undefined — no env wiring
 * on the frontend; absence of events is the off-signal.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, Bug, Zap, Server, Code, Activity } from 'lucide-react'

export default function TracePanel({ traces }) {
  const [open, setOpen] = useState(false)
  if (!traces || traces.length === 0) return null

  return (
    <div className="mt-2 w-full max-w-2xl border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-1.5 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        )}
        <Bug className="w-3.5 h-3.5 text-amber-600" />
        <span className="font-medium text-slate-700 dark:text-slate-200">
          Trace
        </span>
        <span className="text-[10px] text-slate-500">
          {traces.length} event{traces.length === 1 ? '' : 's'}
        </span>
      </button>

      {open && (
        <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {traces.map((t, i) => (
            <TraceRow key={i} trace={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function TraceRow({ trace }) {
  const [expanded, setExpanded] = useState(false)
  const t = trace || {}
  // Default to 'node' for back-compat with traces emitted before kind was added.
  const kind = t.kind || 'node'

  const meta = headerMeta(kind, t)

  return (
    <div className="px-3 py-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          )}
          {meta.Icon}
          <span className={`font-mono text-[11px] truncate ${meta.titleClass}`}>
            {meta.title}
          </span>
          {meta.subtitle && (
            <span className="text-[10px] text-slate-500 truncate">
              {meta.subtitle}
            </span>
          )}
        </div>
        {typeof t.duration_ms === 'number' && (
          <span className="text-[10px] text-slate-400 shrink-0">
            {t.duration_ms < 1 ? '<1' : Math.round(t.duration_ms)} ms
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 ml-5 space-y-1.5">
          {renderBody(kind, t)}
        </div>
      )}
    </div>
  )
}

function headerMeta(kind, t) {
  if (kind === 'mcp_call') {
    return {
      Icon: <Server className="w-3 h-3 text-blue-500 shrink-0" />,
      title: `mcp → ${t.tool || '?'}`,
      titleClass: 'text-blue-700 dark:text-blue-300',
      subtitle: 'request',
    }
  }
  if (kind === 'mcp_result') {
    const ok = t.status && t.status !== 'error' && t.status !== 'auth_expired'
    return {
      Icon: <Server className={`w-3 h-3 shrink-0 ${ok ? 'text-emerald-500' : 'text-red-500'}`} />,
      title: `mcp ← ${t.tool || '?'}`,
      titleClass: ok
        ? 'text-emerald-700 dark:text-emerald-300'
        : 'text-red-700 dark:text-red-300',
      subtitle: t.status || '',
    }
  }
  if (kind === 'python_engine') {
    return {
      Icon: <Code className="w-3 h-3 text-violet-500 shrink-0" />,
      title: `py → ${t.caller || 'sandbox'}`,
      titleClass: 'text-violet-700 dark:text-violet-300',
      subtitle: t.input_size ? formatInputSize(t.input_size) : '',
    }
  }
  if (kind === 'python_engine_result') {
    const ok = t.status === 'ok'
    return {
      Icon: <Code className={`w-3 h-3 shrink-0 ${ok ? 'text-emerald-500' : 'text-red-500'}`} />,
      title: `py ← ${t.caller || 'sandbox'}`,
      titleClass: ok
        ? 'text-emerald-700 dark:text-emerald-300'
        : 'text-red-700 dark:text-red-300',
      subtitle: t.status || '',
    }
  }
  if (kind === 'node') {
    return {
      Icon: <Zap className="w-3 h-3 text-amber-500 shrink-0" />,
      title: t.node || 'node',
      titleClass: 'text-slate-800 dark:text-slate-100',
      subtitle: '',
    }
  }
  // Generic agent trace event (e.g. auto_progress_chain_start,
  // auto_progress_step_start) — show the event name as the title and a short
  // inline summary of its payload fields.
  return {
    Icon: <Activity className="w-3 h-3 text-violet-500 shrink-0" />,
    title: kind,
    titleClass: 'text-violet-700 dark:text-violet-300',
    subtitle: inlineSummary(t),
  }
}

// One-line preview of a generic event's payload — "k=v · k=v", envelope
// fields stripped, each value clipped so the header stays single-line.
function inlineSummary(t) {
  const parts = []
  for (const [k, v] of Object.entries(t || {})) {
    if (ENVELOPE_KEYS.has(k)) continue
    const val = v && typeof v === 'object' ? JSON.stringify(v) : String(v)
    parts.push(`${k}=${val.length > 40 ? val.slice(0, 40) + '…' : val}`)
  }
  return parts.join(' · ').slice(0, 120)
}

const ENVELOPE_KEYS = new Set(['kind', 'ts', 'duration_ms', 'node', 'output'])

function stripEnvelope(t) {
  const out = {}
  for (const [k, v] of Object.entries(t || {})) {
    if (k === 'kind' || k === 'ts' || k === 'duration_ms') continue
    out[k] = v
  }
  return out
}

function renderBody(kind, t) {
  if (kind === 'mcp_call') {
    return [<JsonBlock key="args" label="args" value={t.args} />]
  }
  if (kind === 'mcp_result') {
    return [<JsonBlock key="result" label="result" value={t.result} />]
  }
  if (kind === 'python_engine') {
    return [
      <CodeBlock key="code" label="code" value={t.code} />,
      <JsonBlock key="size" label="input" value={t.input_size || t.input_keys} />,
    ]
  }
  if (kind === 'python_engine_result') {
    return t.status === 'ok'
      ? [<JsonBlock key="output" label="output" value={t.output} />]
      : [<JsonBlock key="error" label="error" value={t.error} />]
  }
  if (kind === 'node') {
    return [<JsonBlock key="output" label="output" value={t.output} />]
  }
  // Generic agent event — dump the full payload minus envelope fields.
  return [<JsonBlock key="payload" label="payload" value={stripEnvelope(t)} />]
}

function JsonBlock({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
        {label}
      </div>
      <pre className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-[10px] leading-snug text-slate-700 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap break-words max-h-72">
        {safeStringify(value)}
      </pre>
    </div>
  )
}

function CodeBlock({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
        {label}
      </div>
      <pre className="p-2 bg-violet-50 dark:bg-violet-950/30 rounded text-[10px] leading-snug text-slate-800 dark:text-slate-100 overflow-x-auto whitespace-pre max-h-72 font-mono">
        {value || '(empty)'}
      </pre>
    </div>
  )
}

function formatInputSize(size) {
  if (!size || typeof size !== 'object') return ''
  return Object.entries(size)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
}

function safeStringify(v) {
  if (v === undefined) return '(no payload)'
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}
