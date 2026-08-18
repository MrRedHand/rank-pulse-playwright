export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatSnapshotDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}.${month}`
}

export function formatLastParsedAt(iso: string): string {
  const parsedAt = new Date(iso)
  const today = getLocalDateString()
  const parsedDate = getLocalDateString(parsedAt)
  const time = parsedAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (parsedDate === today) {
    return `today at ${time}`
  }

  return `${formatSnapshotDate(parsedDate)} at ${time}`
}
