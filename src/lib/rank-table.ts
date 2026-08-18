import type { Keyword, ParseJob, RankSnapshot } from '../types'
import { formatSnapshotDate, getLocalDateString } from './dates'

export const REFRESH_COLUMN_ID = 'refresh'

export type RankCellDisplay =
  | { type: 'value'; rank: number; delta: number | null }
  | { type: 'missing' }
  | { type: 'empty' }
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'refresh' }

export type RankTableColumn =
  | { id: string; kind: 'date'; label: string; date: string }
  | { id: typeof REFRESH_COLUMN_ID; kind: 'refresh'; label: string }

export type RankTableRow = {
  keywordId: string
  keyword: string
  cells: Record<string, RankCellDisplay>
}

export type RankTableModel = {
  columns: RankTableColumn[]
  rows: RankTableRow[]
}

function buildValueCell(
  rank: number | null | undefined,
  previousRank: number | null | undefined,
): RankCellDisplay {
  if (rank === undefined) {
    return { type: 'empty' }
  }

  if (rank === null) {
    return { type: 'missing' }
  }

  const delta =
    previousRank !== undefined && previousRank !== null
      ? previousRank - rank
      : null

  return { type: 'value', rank, delta }
}

function buildTodayCell(
  keywordId: string,
  historyRank: number | null | undefined,
  previousRank: number | null | undefined,
  job: ParseJob | null | undefined,
  pendingKeywordIds: string[],
): RankCellDisplay {
  const result = job?.results[keywordId]
  const isQueued =
    pendingKeywordIds.includes(keywordId) &&
    (!result || result.status === 'pending' || result.status === 'parsing')

  if (
    isQueued ||
    result?.status === 'pending' ||
    result?.status === 'parsing'
  ) {
    return { type: 'loading' }
  }

  if (!job || !result) {
    return buildValueCell(historyRank, previousRank)
  }

  if (result.status === 'error') {
    return { type: 'error' }
  }

  return buildValueCell(result.rank, previousRank)
}

export function isKeywordParseBusy(
  keywordId: string,
  job?: ParseJob | null,
  pendingKeywordIds: string[] = [],
): boolean {
  const result = job?.results[keywordId]
  if (result?.status === 'pending' || result?.status === 'parsing') {
    return true
  }
  return pendingKeywordIds.includes(keywordId)
}

export function buildRankTable(
  keywords: Keyword[],
  history: RankSnapshot[],
  job?: ParseJob | null,
  pendingKeywordIds: string[] = [],
): RankTableModel {
  const today = getLocalDateString()
  const snapshotByDate = new Map(
    history.map((snapshot) => [snapshot.date, snapshot]),
  )

  const pastDates = [...new Set(history.map((snapshot) => snapshot.date))]
    .filter((date) => date !== today)
    .sort()

  const columns: RankTableColumn[] = [
    ...pastDates.map((date) => ({
      id: date,
      kind: 'date' as const,
      label: formatSnapshotDate(date),
      date,
    })),
    { id: 'today', kind: 'date', label: 'today', date: today },
    { id: REFRESH_COLUMN_ID, kind: 'refresh', label: '' },
  ]

  const rows: RankTableRow[] = keywords.map((keyword) => {
    const cells: Record<string, RankCellDisplay> = {}
    let previousRank: number | null | undefined = undefined

    for (const column of columns) {
      if (column.kind === 'refresh') {
        cells[column.id] = { type: 'refresh' }
        continue
      }

      if (column.id === 'today') {
        const historyRank = snapshotByDate.get(today)?.results[keyword.id]
        const cell = buildTodayCell(
          keyword.id,
          historyRank,
          previousRank,
          job,
          pendingKeywordIds,
        )
        cells[column.id] = cell

        if (cell.type === 'value') {
          previousRank = cell.rank
        }

        continue
      }

      const rank = snapshotByDate.get(column.date)?.results[keyword.id]
      cells[column.id] = buildValueCell(rank, previousRank)

      if (rank !== undefined && rank !== null) {
        previousRank = rank
      }
    }

    return {
      keywordId: keyword.id,
      keyword: keyword.value,
      cells,
    }
  })

  return { columns, rows }
}

export function formatRankDelta(delta: number | null): string | null {
  if (delta === null || delta === 0) {
    return null
  }

  if (delta > 0) {
    return `↓ ${delta}`
  }

  return `↑ ${Math.abs(delta)}`
}
