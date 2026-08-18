import type { ParseJob, RankSnapshot } from '../types'

export function upsertSnapshot(
  history: RankSnapshot[],
  snapshot: RankSnapshot,
): RankSnapshot[] {
  const index = history.findIndex((item) => item.date === snapshot.date)

  if (index === -1) {
    return [...history, snapshot]
  }

  const next = [...history]
  next[index] = snapshot
  return next
}

export function snapshotFromJob(job: ParseJob, date: string): RankSnapshot {
  const results: Record<string, number | null> = {}
  for (const [keywordId, result] of Object.entries(job.results)) {
    results[keywordId] = result.status === 'done' ? result.rank : null
  }
  return { date, results }
}
