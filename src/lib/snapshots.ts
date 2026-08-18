import type { RankSnapshot } from '../types'

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
