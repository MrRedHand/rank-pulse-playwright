export function buildPlayStoreSearchUrl(
  keyword: string,
  countryCode: string,
): string {
  const params = new URLSearchParams({
    q: keyword,
    c: 'apps',
    hl: 'en',
    gl: countryCode,
  })

  return `https://play.google.com/store/search?${params.toString()}`
}

export function extractAppIdFromHref(href: string): string | null {
  try {
    const url = new URL(href, 'https://play.google.com')
    if (!url.pathname.startsWith('/store/apps/details')) {
      return null
    }

    const id = url.searchParams.get('id')
    return id?.trim() ? id.trim() : null
  } catch {
    return null
  }
}

export function uniqueAppIdsFromHrefs(hrefs: string[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()

  for (const href of hrefs) {
    const appId = extractAppIdFromHref(href)
    if (!appId || seen.has(appId)) {
      continue
    }

    seen.add(appId)
    ids.push(appId)
  }

  return ids
}

export function findRankInAppIds(
  appIds: string[],
  targetPackageId: string,
): number | null {
  const index = appIds.indexOf(targetPackageId)
  return index === -1 ? null : index + 1
}
