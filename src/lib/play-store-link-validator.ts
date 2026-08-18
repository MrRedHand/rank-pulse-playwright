export const PLAY_STORE_DETAILS_PREFIX =
  'https://play.google.com/store/apps/details?id='

export const PLAY_STORE_LINK_ERROR = 'Wrong link, use direct link to the game'

export function isValidPlayStoreLink(rawUrl: string): boolean {
  const url = rawUrl.trim()
  if (!url.startsWith(PLAY_STORE_DETAILS_PREFIX)) {
    return false
  }
  return extractPlayStoreAppId(url) !== null
}

export function extractPlayStoreAppId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim())
    if (url.hostname !== 'play.google.com') {
      return null
    }
    if (!url.pathname.startsWith('/store/apps/details')) {
      return null
    }
    const id = url.searchParams.get('id')
    return id?.trim() ? id.trim() : null
  } catch {
    return null
  }
}

export function normalizePlayStoreLink(rawUrl: string): string {
  return rawUrl.trim()
}
