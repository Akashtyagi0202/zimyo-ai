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

const BADGE_COLORS = {
  // Status badges
  Approved: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-800',
  Rejected: 'bg-red-100 text-red-700',
  Active: 'bg-green-100 text-green-700',
  Expired: 'bg-gray-100 text-gray-600',
  // Holiday types
  National: 'bg-red-100 text-red-700',
  Public: 'bg-blue-100 text-blue-700',
  Restricted: 'bg-amber-100 text-amber-700',
  Festival: 'bg-purple-100 text-purple-700',
  // Generic
  default: 'bg-gray-100 text-gray-700',
}

function formatCell(value, type) {
  if (value === null || value === undefined) return '—'
  if (type === 'currency') return `₹${Number(value).toLocaleString('en-IN')}`
  if (type === 'date' && value.includes('-')) {
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

  // Filter rows by search
  let filtered = rows
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = rows.filter(row =>
      columns.some(col => String(row[col.id] ?? '').toLowerCase().includes(q))
    )
  }

  // Sort
  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      const va = a[sortCol] ?? '', vb = b[sortCol] ?? ''
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  // Group
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

  // Empty state
  if (!rows.length && emptyState) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center mt-2 animate-fade-in-scale">
        <p className="text-sm font-medium text-gray-700">{emptyState.title}</p>
        {emptyState.description && <p className="text-xs text-gray-500 mt-1">{emptyState.description}</p>}
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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden w-full max-w-2xl mt-2 animate-fade-in-scale">
      {/* Header */}
      {title && (
        <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <div className="flex items-center gap-3">
            {summary && (
              <span className="text-xs text-gray-500">{summary.label}: {summary.value}</span>
            )}
            <button
              type="button"
              onClick={() => downloadCsv(title, visibleCols, filtered)}
              title="Download as CSV"
              aria-label="Download as CSV"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {searchable && (
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={msg.searchPlaceholder || 'Search...'}
              className="bg-transparent outline-none text-xs flex-1 text-gray-700 placeholder:text-gray-400"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-gray-200 bg-gray-50">
              {visibleCols.map(col => (
                <th
                  key={col.id}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none
                    ${col.align === 'right' || col.type === 'number' || col.type === 'currency' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                    ${col.sortable ? 'cursor-pointer hover:text-gray-700' : ''}`}
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

      {/* Footer actions */}
      {actions && actions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 flex gap-2 justify-end">
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => onAction?.({ action: a.id })}
              className="text-xs text-blue-600 hover:underline"
            >
              {a.label}
            </button>
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
          <td colSpan={colSpan} className="px-4 py-1.5 bg-gray-50/70 border-b border-gray-100">
            <span className="text-[11px] font-semibold text-gray-400">{groupName}</span>
          </td>
        </tr>
      )}
      {rows.map((row, i) => (
        <tr key={row.id || i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
          {columns.map(col => (
            <td
              key={col.id}
              className={`px-4 py-2.5 text-gray-700
                ${col.align === 'right' || col.type === 'number' || col.type === 'currency' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                ${col.type === 'number' || col.type === 'currency' ? 'font-medium' : ''}`}
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
  if (value === null || value === undefined) return <span className="text-gray-300">—</span>

  // Badge (object with label+color OR string)
  if (col.type === 'badge') {
    if (typeof value === 'object' && value.label) {
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[value.label] ?? BADGE_COLORS.default}`}>
          {value.label}
        </span>
      )
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[value] ?? BADGE_COLORS.default}`}>
        {value}
      </span>
    )
  }

  // Action group
  if (col.type === 'action_group' && typeof value === 'object' && value.actions) {
    return (
      <div className="flex gap-2">
        {value.actions.map(a => (
          <button
            key={a.id}
            onClick={() => !a.disabled && onAction?.({ action: a.id })}
            disabled={a.disabled}
            title={a.disabled ? a.disabledReason : undefined}
            className={`text-xs font-medium ${
              a.style === 'danger' ? 'text-red-600 hover:text-red-700' :
              a.style === 'primary' ? 'text-blue-600 hover:text-blue-700' :
              'text-gray-600 hover:text-gray-800'
            } ${a.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:underline'}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    )
  }

  // Single action
  if (col.type === 'action' && typeof value === 'object') {
    return (
      <button
        onClick={() => onAction?.({ action: value.id })}
        className="text-xs text-blue-600 hover:underline font-medium"
      >
        {value.label}
      </button>
    )
  }

  return <>{formatCell(value, col.type)}</>
}
