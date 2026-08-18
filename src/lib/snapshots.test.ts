import { describe, expect, it } from 'vitest'
import { snapshotFromJob, upsertSnapshot } from './snapshots'
import type { ParseJob, RankSnapshot } from '../types'

const today = '2026-08-18'

function job(results: ParseJob['results']): ParseJob {
  return {
    id: 'job-1',
    status: 'done',
    results,
    keywordQueue: [],
  }
}

describe('snapshotFromJob', () => {
  it('writes done ranks and ignores errors, pending, and parsing', () => {
    const base: RankSnapshot = {
      date: today,
      results: { k2: 9, k3: 1, k4: 2 },
    }

    const snapshot = snapshotFromJob(
      job({
        k1: { status: 'done', rank: 4 },
        k2: { status: 'error', rank: null },
        k3: { status: 'pending', rank: null },
        k4: { status: 'parsing', rank: null },
        k5: { status: 'done', rank: null },
      }),
      today,
      base,
    )

    expect(snapshot).toEqual({
      date: today,
      results: {
        k1: 4,
        k2: 9,
        k3: 1,
        k4: 2,
        k5: null,
      },
    })
  })

  it('does not copy a base snapshot from another date', () => {
    const snapshot = snapshotFromJob(
      job({ k1: { status: 'done', rank: 3 } }),
      today,
      { date: '2026-08-17', results: { k2: 8 } },
    )

    expect(snapshot.results).toEqual({ k1: 3 })
  })
})

describe('upsertSnapshot', () => {
  it('replaces a snapshot on the same date', () => {
    const history: RankSnapshot[] = [
      { date: '2026-08-17', results: { k1: 2 } },
      { date: today, results: { k1: 5 } },
    ]

    expect(
      upsertSnapshot(history, { date: today, results: { k1: 1 } }),
    ).toEqual([
      { date: '2026-08-17', results: { k1: 2 } },
      { date: today, results: { k1: 1 } },
    ])
  })
})
