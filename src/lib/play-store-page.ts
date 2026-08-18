const PLAY_STORE_TITLE_SUFFIX = ' - Apps on Google Play'

export function sanitizePlayStoreTitle(pageTitle: string): string {
  const trimmed = pageTitle.trim()
  if (trimmed.endsWith(PLAY_STORE_TITLE_SUFFIX)) {
    return trimmed.slice(0, -PLAY_STORE_TITLE_SUFFIX.length).trim()
  }
  return trimmed
}
