import type { Keyword, RankSnapshot } from '../types'
import { formatSnapshotDate, getLocalDateString } from './dates'

export type RankCellDisplay =
  | { type: 'value'; rank: number; delta: number | null }
  | { type: 'missing' }
  | { type: 'empty' }

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

function buildCell(
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

export function buildRankTable(
  keywords: Keyword[],
  history: RankSnapshot[],
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
      const snapshot = snapshotByDate.get(column.date)
      const rank = snapshot?.results[keyword.id]
      cells[column.id] = buildCell(rank, previousRank)

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
