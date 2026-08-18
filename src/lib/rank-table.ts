import type { Keyword, ParseJob, RankSnapshot } from '../types'
import { formatSnapshotDate, getLocalDateString } from './dates'

export type RankCellDisplay =
  | { type: 'value'; rank: number; delta: number | null }
  | { type: 'missing' }
  | { type: 'empty' }
  | { type: 'loading' }
  | { type: 'error' }

export type RankTableColumn = {
  id: string
  label: string
  date: string
}

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
): RankCellDisplay {
  if (!job) {
    return buildValueCell(historyRank, previousRank)
  }

  const result = job.results[keywordId]
  if (!result || result.status === 'pending' || result.status === 'parsing') {
    return { type: 'loading' }
  }

  if (result.status === 'error') {
    return { type: 'error' }
  }

  return buildValueCell(result.rank, previousRank)
}

export function buildRankTable(
  keywords: Keyword[],
  history: RankSnapshot[],
  job?: ParseJob | null,
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
      label: formatSnapshotDate(date),
      date,
    })),
    { id: 'today', label: 'today', date: today },
  ]

  const rows: RankTableRow[] = keywords.map((keyword) => {
    const cells: Record<string, RankCellDisplay> = {}
    let previousRank: number | null | undefined = undefined

    for (const column of columns) {
      if (column.id === 'today') {
        const historyRank = snapshotByDate.get(today)?.results[keyword.id]
        const cell = buildTodayCell(keyword.id, historyRank, previousRank, job)
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
