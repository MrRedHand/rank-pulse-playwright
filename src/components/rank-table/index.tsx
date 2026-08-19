import { memo } from 'react'
import {
  buildRankTable,
  formatRankDelta,
  isKeywordParseBusy,
  type RankCellDisplay,
  type RankTableModel,
} from '../../lib/rank-table'
import type { Keyword, ParseJob, RankSnapshot } from '../../types'
import { formatLastParsedAt } from '../../lib/dates'
import { Button } from '../button'
import styles from './index.module.css'

type RankTableProps = {
  keywords: Keyword[]
  history: RankSnapshot[]
  lastParsedAt: string | null
  job?: ParseJob | null
  pendingKeywordIds?: string[]
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
      className={styles.icon}
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
    return <span className={styles.muted}> </span>
  }

  if (cell.type === 'missing') {
    return <span className={styles.muted}>—</span>
  }

  if (cell.type === 'loading') {
    return <span className={styles.spinner} aria-label="Parsing" />
  }

  if (cell.type === 'error') {
    return <span className={styles.danger}>!</span>
  }

  if (cell.type === 'refresh') {
    return (
      <Button
        variant="ghost"
        className={styles.refresh}
        onClick={() => onRefreshKeyword?.(keywordId)}
        disabled={refreshDisabled || !onRefreshKeyword}
        aria-label="Refresh keyword ranking"
        title="Refresh"
      >
        <ArrowPathIcon />
      </Button>
    )
  }

  const deltaLabelObject = formatRankDelta(cell.delta)
  return (
    <span className={styles.rank}>
      <span>{cell.rank}</span>
      {deltaLabelObject && (
        <span
          className={[
            styles.delta,
            deltaLabelObject.isDegrade ? styles.negative : styles.positive,
          ].join(' ')}
        >
          {deltaLabelObject.value}
        </span>
      )}
    </span>
  )
}

export const RankTable = memo(function RankTable({
  keywords,
  history,
  lastParsedAt,
  job = null,
  pendingKeywordIds = [],
  onRefreshKeyword,
}: RankTableProps) {
  const model: RankTableModel = buildRankTable(
    keywords,
    history,
    job,
    pendingKeywordIds,
  )

  if (keywords.length === 0) {
    return null
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headRow}>
              <th className={styles.heading}>Keyword</th>
              {model.columns.map((column) => (
                <th key={column.id} className={styles.heading}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.keywordId} className={styles.row}>
                <td className={styles.cell}>{row.keyword}</td>
                {model.columns.map((column) => (
                  <td key={column.id} className={styles.cell}>
                    <RankCell
                      cell={row.cells[column.id]}
                      keywordId={row.keywordId}
                      refreshDisabled={isKeywordParseBusy(
                        row.keywordId,
                        job,
                        pendingKeywordIds,
                      )}
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
        <p className={styles.footer}>
          Last run: {formatLastParsedAt(lastParsedAt)}
        </p>
      )}
    </div>
  )
})
