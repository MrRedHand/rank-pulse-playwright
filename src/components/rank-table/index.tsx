import { memo, useMemo } from 'react'
import {
  columnFilteringFeature,
  columnResizingFeature,
  columnSizingFeature,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  REFRESH_COLUMN_ID,
  buildRankTable,
  formatRankDelta,
  isKeywordParseBusy,
  type RankCellDisplay,
  type RankTableRow,
} from '../../lib/rank-table'
import type { Keyword, ParseJob, RankSnapshot } from '../../types'
import { formatLastParsedAt } from '../../lib/dates'
import { Button } from '../shared/button'
import { Input } from '../shared/input'
import styles from './index.module.css'

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  columnSizingFeature,
  columnResizingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric },
})

const EMPTY_CELL: RankCellDisplay = { type: 'empty' }
const MIN_DATE_COLUMNS = 10
const columnHelper = createColumnHelper<typeof features, RankTableRow>()

function sortRankCell(
  rowA: { getValue: (columnId: string) => unknown },
  rowB: { getValue: (columnId: string) => unknown },
  columnId: string,
) {
  return (
    rankSortValue(rowA.getValue(columnId)) -
    rankSortValue(rowB.getValue(columnId))
  )
}

function rankSortValue(value: unknown): number {
  if (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'value' &&
    'rank' in value &&
    typeof value.rank === 'number'
  ) {
    return value.rank
  }
  return Number.NEGATIVE_INFINITY
}

function sortIndicator(direction: false | 'asc' | 'desc'): string {
  if (direction === 'asc') {
    return '↑'
  }
  if (direction === 'desc') {
    return '↓'
  }
  return ''
}

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
  const model = useMemo(
    () => buildRankTable(keywords, history, job, pendingKeywordIds),
    [keywords, history, job, pendingKeywordIds],
  )

  const columns = useMemo(() => {
    const refreshColumn = model.columns.find(
      (column) => column.id === REFRESH_COLUMN_ID,
    )
    const dateColumns = model.columns.filter(
      (column) => column.id !== REFRESH_COLUMN_ID,
    )
    const emptyDateColumns = Array.from(
      { length: Math.max(0, MIN_DATE_COLUMNS - dateColumns.length) },
      (_, index) => ({
        id: `empty-${index}`,
        kind: 'empty' as const,
        label: '',
      }),
    )
    const orderedColumns = [
      ...(refreshColumn ? [refreshColumn] : []),
      ...dateColumns,
      ...emptyDateColumns,
    ]

    return columnHelper.columns([
      columnHelper.accessor('keyword', {
        header: 'Keyword',
        size: 220,
        minSize: 80,
        maxSize: 220,
        enableResizing: true,
      }),
      ...orderedColumns.map((column) => {
        const isRefresh = column.id === REFRESH_COLUMN_ID
        const isEmpty = column.kind === 'empty'
        return columnHelper.accessor(
          (row) => row.cells[column.id] ?? EMPTY_CELL,
          {
            id: column.id,
            header: column.label,
            size: 70,
            minSize: 70,
            maxSize: 70,
            enableResizing: false,
            enableSorting: !isRefresh && !isEmpty,
            enableGlobalFilter: false,
            sortDescFirst: !isRefresh && !isEmpty,
            sortFn: isRefresh || isEmpty ? undefined : sortRankCell,
            cell: ({ getValue, row }) => (
              <RankCell
                cell={getValue()}
                keywordId={row.original.keywordId}
                refreshDisabled={isKeywordParseBusy(
                  row.original.keywordId,
                  job,
                  pendingKeywordIds,
                )}
                onRefreshKeyword={onRefreshKeyword}
              />
            ),
          },
        )
      }),
    ])
  }, [model, job, pendingKeywordIds, onRefreshKeyword])

  const table = useTable({
    features,
    columns,
    data: model.rows,
    getRowId: (row) => row.keywordId,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getColumnCanGlobalFilter: (column) => column.id === 'keyword',
  })

  if (keywords.length === 0) {
    return null
  }

  const rows = table.getRowModel().rows
  const columnCount = table.getAllColumns().length

  return (
    <div className={styles.wrap}>
      <Input
        type="search"
        value={table.state.globalFilter ?? ''}
        onValueChange={(value) => table.setGlobalFilter(value)}
        placeholder="Search keywords"
        aria-label="Search keywords"
        className={styles.search}
      />

      <div className={styles.scroll}>
        <table className={styles.table} style={{ width: table.getTotalSize() }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className={styles.headRow}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={[
                      styles.heading,
                      header.column.id === 'keyword'
                        ? styles.sticky
                        : styles.compact,
                    ].join(' ')}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className={styles.sortButton}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                        <span className={styles.sortIndicator}>
                          {sortIndicator(header.column.getIsSorted())}
                        </span>
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                    {header.column.getCanResize() ? (
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        className={[
                          styles.resizer,
                          header.column.getIsResizing()
                            ? styles.resizerActive
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className={styles.row}>
                <td className={styles.empty} colSpan={columnCount}>
                  No matching keywords.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={styles.row}>
                  {row.getAllCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={[
                        styles.cell,
                        cell.column.id === 'keyword'
                          ? styles.sticky
                          : styles.compact,
                      ].join(' ')}
                      style={{ width: cell.column.getSize() }}
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            )}
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
