import type { ParseJob, RankSnapshot } from '../types'

export function snapshotsForCountry(
  historyByCountry: Record<string, RankSnapshot[]>,
  countryCode: string,
): RankSnapshot[] {
  return historyByCountry[countryCode] ?? []
}

export function lastParsedAtForCountry(
  lastParsedAtByCountry: Record<string, string | null>,
  countryCode: string,
): string | null {
  return lastParsedAtByCountry[countryCode] ?? null
}

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

export function snapshotFromJob(
  job: ParseJob,
  date: string,
  base?: RankSnapshot | null,
): RankSnapshot {
  const results: Record<string, number | null> = {
    ...(base?.date === date ? base.results : {}),
  }

  for (const [keywordId, result] of Object.entries(job.results)) {
    if (result.status !== 'done') {
      continue
    }

    results[keywordId] = result.rank
  }

  return { date, results }
}
