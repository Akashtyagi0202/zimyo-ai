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
import { ChevronDown, ChevronRight, Bug, Zap, Server, Code } from 'lucide-react'

export default function TracePanel({ traces }) {
  const [open, setOpen] = useState(false)
  if (!traces || traces.length === 0) return null

  return (
    <div className="mt-2 w-full max-w-2xl border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-1.5 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        )}
        <Bug className="w-3.5 h-3.5 text-amber-600" />
        <span className="font-medium text-gray-700 dark:text-gray-200">
          Trace
        </span>
        <span className="text-[10px] text-gray-500">
          {traces.length} event{traces.length === 1 ? '' : 's'}
        </span>
      </button>

      {open && (
        <div className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
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
            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
          )}
          {meta.Icon}
          <span className={`font-mono text-[11px] truncate ${meta.titleClass}`}>
            {meta.title}
          </span>
          {meta.subtitle && (
            <span className="text-[10px] text-gray-500 truncate">
              {meta.subtitle}
            </span>
          )}
        </div>
        {typeof t.duration_ms === 'number' && (
          <span className="text-[10px] text-gray-400 shrink-0">
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
  // Default — node tick
  return {
    Icon: <Zap className="w-3 h-3 text-amber-500 shrink-0" />,
    title: t.node || '?',
    titleClass: 'text-gray-800 dark:text-gray-100',
    subtitle: '',
  }
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
  // Node — original behavior
  return [<JsonBlock key="output" label="output" value={t.output} />]
}

function JsonBlock({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">
        {label}
      </div>
      <pre className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-[10px] leading-snug text-gray-700 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-words max-h-72">
        {safeStringify(value)}
      </pre>
    </div>
  )
}

function CodeBlock({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">
        {label}
      </div>
      <pre className="p-2 bg-violet-50 dark:bg-violet-950/30 rounded text-[10px] leading-snug text-gray-800 dark:text-gray-100 overflow-x-auto whitespace-pre max-h-72 font-mono">
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
