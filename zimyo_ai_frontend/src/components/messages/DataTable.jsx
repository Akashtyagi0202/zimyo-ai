/**
 * DataTable — renders ui.type === "table"
 *
 * Spec fields used:
 *   title, columns[], rows[], groupBy?, searchable?, filters?,
 *   pagination?, summary?, emptyState?, actions?, selectable?
 *
 * Column spec: { id, label, type?, width?, sortable?, align? }
 *   type: "text" | "number" | "date" | "badge" | "avatar" | "action" | "action_group"
 */

import { useState } from 'react'
import { Search, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const BADGE_COLORS = {
  // Status
  Approved:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Pending:    'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  Rejected:   'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Active:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Expired:    'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  // Holiday types
  National:   'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Public:     'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  Restricted: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Festival:   'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  default:    'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
}

function formatCell(value, type) {
  if (value === null || value === undefined) return '—'
  if (type === 'currency') return `₹${Number(value).toLocaleString('en-IN')}`
  if (type === 'date' && typeof value === 'string' && value.includes('-')) {
    try {
      return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return value }
  }
  return value
}

// Plain-text representation of a cell for CSV export. Mirrors the display
// formatter but strips badge wrappers, action button labels, etc. so the
// downloaded file is a clean spreadsheet, not styled UI.
function csvCell(col, value) {
  if (value === null || value === undefined) return ''
  if (col.type === 'badge') {
    if (typeof value === 'object' && value.label) return String(value.label)
    return String(value)
  }
  if (col.type === 'action' && typeof value === 'object') return String(value.label || '')
  if (col.type === 'action_group' && typeof value === 'object' && Array.isArray(value.actions)) {
    return value.actions.map(a => a.label).filter(Boolean).join(' / ')
  }
  return String(formatCell(value, col.type))
}

function escapeCsv(s) {
  // RFC 4180: wrap in quotes if the field contains comma, quote, CR or LF;
  // double any embedded quotes.
  const v = s == null ? '' : String(s)
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

function downloadCsv(title, columns, rows) {
  const header = columns.map(c => escapeCsv(c.label || c.id)).join(',')
  const body = rows
    .map(r => columns.map(c => escapeCsv(csvCell(c, r[c.id]))).join(','))
    .join('\n')
  const csv = `${header}\n${body}\n`
  // BOM so Excel opens UTF-8 names correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = (title || 'export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export'
  a.href = url
  a.download = `${safeName}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function DataTable({ msg, onAction }) {
  const { title, columns = [], rows = [], groupBy, searchable, summary, emptyState, actions } = msg
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  let filtered = rows
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = rows.filter(row =>
      columns.some(col => String(row[col.id] ?? '').toLowerCase().includes(q))
    )
  }

  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      const va = a[sortCol] ?? '', vb = b[sortCol] ?? ''
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  const grouped = {}
  if (groupBy) {
    filtered.forEach(row => {
      const key = row[groupBy] || 'Other'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(row)
    })
  } else {
    grouped['_all'] = filtered
  }

  const visibleCols = columns.filter(c => c.id !== groupBy)

  if (!rows.length && emptyState) {
    return (
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-7 text-center mt-2 animate-fade-in-scale">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{emptyState.title}</p>
        {emptyState.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{emptyState.description}</p>
        )}
      </div>
    )
  }
  if (!rows.length) return null

  const handleSort = (colId) => {
    if (sortCol === colId) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colId)
      setSortDir('asc')
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale shadow-sm">
      {title && (
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
          <div className="flex items-center gap-2">
            {summary && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {summary.label}: <span className="font-medium text-slate-700 dark:text-slate-200">{summary.value}</span>
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadCsv(title, visibleCols, filtered)}
              title="Download as CSV"
              aria-label="Download as CSV"
              className="h-7 px-2 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      )}

      {searchable && (
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={msg.searchPlaceholder || 'Search…'}
              className="h-8 pl-8 text-xs rounded-lg"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 backdrop-blur">
              {visibleCols.map(col => (
                <th
                  key={col.id}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-2.5 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none',
                    col.align === 'right' || col.type === 'number' || col.type === 'currency'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left',
                    col.sortable && 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                  onClick={() => col.sortable && handleSort(col.id)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortCol === col.id && (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([groupName, groupRows]) => (
              <GroupRows
                key={groupName}
                groupName={groupBy ? groupName : null}
                rows={groupRows}
                columns={visibleCols}
                colSpan={visibleCols.length}
                onAction={onAction}
              />
            ))}
          </tbody>
        </table>
      </div>

      {actions && actions.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex gap-2 justify-end">
          {actions.map(a => (
            <Button
              key={a.id}
              variant="link"
              size="sm"
              onClick={() => onAction?.({ action: a.id })}
              className="h-7 px-1 text-xs text-indigo-600 dark:text-indigo-400"
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupRows({ groupName, rows, columns, colSpan, onAction }) {
  return (
    <>
      {groupName && (
        <tr>
          <td colSpan={colSpan} className="px-4 py-1.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {groupName}
            </span>
          </td>
        </tr>
      )}
      {rows.map((row, i) => (
        <tr
          key={row.id || i}
          className="border-b border-slate-50 dark:border-slate-800/60 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        >
          {columns.map(col => (
            <td
              key={col.id}
              className={cn(
                'px-4 py-2.5 text-slate-700 dark:text-slate-200',
                (col.align === 'right' || col.type === 'number' || col.type === 'currency') && 'text-right',
                col.align === 'center' && 'text-center',
                (col.type === 'number' || col.type === 'currency') && 'font-medium tabular-nums'
              )}
            >
              <CellValue col={col} value={row[col.id]} onAction={onAction} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function CellValue({ col, value, onAction }) {
  if (value === null || value === undefined) return <span className="text-slate-300 dark:text-slate-600">—</span>

  if (col.type === 'badge') {
    if (typeof value === 'object' && value.label) {
      return (
        <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', BADGE_COLORS[value.label] ?? BADGE_COLORS.default)}>
          {value.label}
        </span>
      )
    }
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', BADGE_COLORS[value] ?? BADGE_COLORS.default)}>
        {value}
      </span>
    )
  }

  if (col.type === 'action_group' && typeof value === 'object' && value.actions) {
    return (
      <div className="flex gap-2">
        {value.actions.map(a => (
          <button
            key={a.id}
            onClick={() => !a.disabled && onAction?.({ action: a.id })}
            disabled={a.disabled}
            title={a.disabled ? a.disabledReason : undefined}
            className={cn(
              'text-xs font-medium transition-colors',
              a.style === 'danger'
                ? 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300'
                : a.style === 'primary'
                  ? 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100',
              a.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:underline'
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
    )
  }

  if (col.type === 'action' && typeof value === 'object') {
    return (
      <button
        onClick={() => onAction?.({ action: value.id })}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
      >
        {value.label}
      </button>
    )
  }

  return <>{formatCell(value, col.type)}</>
}
