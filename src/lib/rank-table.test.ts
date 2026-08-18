import { describe, expect, it } from 'vitest'
import { buildRankTable } from './rank-table'
import type { Keyword, ParseJob, RankSnapshot } from '../types'

const keywords: Keyword[] = [
  { id: 'k1', value: 'puzzle' },
  { id: 'k2', value: 'match 3' },
]

function job(
  results: ParseJob['results'],
  status: ParseJob['status'] = 'running',
): ParseJob {
  return {
    id: 'job-1',
    status,
    results,
    keywordQueue: keywords,
  }
}

describe('buildRankTable', () => {
  it('shows loading for queued and in-flight keywords', () => {
    const model = buildRankTable(
      keywords,
      [],
      job({ k1: { status: 'parsing', rank: null } }),
      ['k2'],
    )

    expect(model.rows[0].cells.today).toEqual({ type: 'loading' })
    expect(model.rows[1].cells.today).toEqual({ type: 'loading' })
  })

  it('shows error for a failed keyword and missing for a done null rank', () => {
    const model = buildRankTable(
      keywords,
      [],
      job(
        {
          k1: { status: 'error', rank: null },
          k2: { status: 'done', rank: null },
        },
        'done',
      ),
    )

    expect(model.rows[0].cells.today).toEqual({ type: 'error' })
    expect(model.rows[1].cells.today).toEqual({ type: 'missing' })
  })

  it('uses persisted history when there is no live job result', () => {
    const history: RankSnapshot[] = [{ date: '2026-08-17', results: { k1: 8 } }]

    const model = buildRankTable(keywords, history)

    expect(model.rows[0].cells['2026-08-17']).toEqual({
      type: 'value',
      rank: 8,
      delta: null,
    })
    expect(model.rows[0].cells.today).toEqual({ type: 'empty' })
    expect(model.rows[1].cells['2026-08-17']).toEqual({ type: 'empty' })
  })
})
