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
}

function RankCell({ cell }: { cell: RankCellDisplay }) {
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

  const deltaLabel = formatRankDelta(cell.delta)

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{cell.rank}</span>
      {deltaLabel && <span className="text-xs text-muted">{deltaLabel}</span>}
    </span>
  )
}

export function RankTable({
  keywords,
  history,
  lastParsedAt,
  job = null,
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
                    <RankCell cell={row.cells[column.id]} />
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
}
