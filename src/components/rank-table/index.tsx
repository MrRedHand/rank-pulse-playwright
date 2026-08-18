import { memo } from 'react'
import type { RankCellDisplay } from '../../lib/rank-table'
import {
  buildRankTable,
  formatRankDelta,
  type RankTableModel,
} from '../../lib/rank-table'
import type { Keyword, ParseJob, RankSnapshot } from '../../types'
import { formatLastParsedAt } from '../../lib/dates'

type RankTableProps = {
  keywords: Keyword[]
  history: RankSnapshot[]
  lastParsedAt: string | null
  job?: ParseJob | null
  refreshDisabled?: boolean
  onRefreshKeyword?: (keywordId: string) => void
}

function ArrowPathIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  )
}

function RankCell({
  cell,
  keywordId,
  refreshDisabled = false,
  onRefreshKeyword,
}: {
  cell: RankCellDisplay
  keywordId: string
  refreshDisabled?: boolean
  onRefreshKeyword?: (keywordId: string) => void
}) {
  if (cell.type === 'empty') {
    return <span className="text-muted"> </span>
  }

  if (cell.type === 'missing') {
    return <span className="text-muted">—</span>
  }

  if (cell.type === 'loading') {
    return (
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-accent"
        aria-label="Parsing"
      />
    )
  }

  if (cell.type === 'error') {
    return <span className="text-danger">!</span>
  }

  if (cell.type === 'refresh') {
    return (
      <button
        type="button"
        onClick={() => onRefreshKeyword?.(keywordId)}
        disabled={refreshDisabled || !onRefreshKeyword}
        className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-text-h disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
        aria-label="Refresh keyword ranking"
        title="Refresh"
      >
        <ArrowPathIcon />
      </button>
    )
  }

  const deltaLabel = formatRankDelta(cell.delta)

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{cell.rank}</span>
      {deltaLabel && <span className="text-xs text-muted">{deltaLabel}</span>}
    </span>
  )
}

export const RankTable = memo(function RankTable({
  keywords,
  history,
  lastParsedAt,
  job = null,
  refreshDisabled = false,
  onRefreshKeyword,
}: RankTableProps) {
  const model: RankTableModel = buildRankTable(keywords, history, job)

  if (keywords.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border bg-bg/60">
              <th className="px-4 py-3 text-left font-medium text-muted">
                Keyword
              </th>
              {model.columns.map((column) => (
                <th
                  key={column.id}
                  className="px-4 py-3 text-left font-medium text-muted"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr
                key={row.keywordId}
                className="border-b border-border last:border-b-0"
              >
                <td className="px-4 py-3 text-text-h">{row.keyword}</td>
                {model.columns.map((column) => (
                  <td key={column.id} className="px-4 py-3 text-text-h">
                    <RankCell
                      cell={row.cells[column.id]}
                      keywordId={row.keywordId}
                      refreshDisabled={refreshDisabled}
                      onRefreshKeyword={onRefreshKeyword}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lastParsedAt && (
        <p className="text-sm text-muted">
          Last run: {formatLastParsedAt(lastParsedAt)}
        </p>
      )}
    </div>
  )
})
