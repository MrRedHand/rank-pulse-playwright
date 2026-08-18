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

export function findRankInAppIds(
  appIds: string[],
  targetPackageId: string,
): number | null {
  const index = appIds.indexOf(targetPackageId)
  return index === -1 ? null : index + 1
}
