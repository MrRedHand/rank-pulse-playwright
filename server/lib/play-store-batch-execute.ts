const PLAY_STORE_BATCH_EXECUTE_PATH = '/_/PlayStoreUi/data/batchexecute'
const XSSI_PREFIX = ")]}'"
const SEARCH_RESULT_RPC_IDS = ['lGYRle', 'qnKhOb'] as const
const MIN_SEARCH_RESULTS_BODY_LENGTH = 10_000

export const PLAY_STORE_SEARCH_MAX_RESULTS = 250

const PACKAGE_ID_RE = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*){2,}$/
const DETAILS_ID_RE =
  /(?:\/store\/apps\/details\?id=)([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*){2,})/g

export type SearchResultRank = {
  bundleName: string
  place: number
}

function isPackageId(value: string): boolean {
  return PACKAGE_ID_RE.test(value)
}

function detailsIdPattern(): RegExp {
  return new RegExp(DETAILS_ID_RE.source, 'g')
}

export function isPlayStoreBatchExecuteUrl(url: string): boolean {
  return url.includes(PLAY_STORE_BATCH_EXECUTE_PATH)
}

export function getBatchExecuteRpcIds(url: string): string {
  try {
    return new URL(url).searchParams.get('rpcids') ?? ''
  } catch {
    return ''
  }
}

export function isPlayStoreSearchResultsBatch(
  url: string,
  body: string,
): boolean {
  if (!isPlayStoreBatchExecuteUrl(url)) {
    return false
  }

  const rpcids = getBatchExecuteRpcIds(url)
  if (SEARCH_RESULT_RPC_IDS.some((rpcId) => rpcids.includes(rpcId))) {
    return true
  }

  return body.length >= MIN_SEARCH_RESULTS_BODY_LENGTH
}

export function stripXssiPrefix(raw: string): string {
  return raw.startsWith(XSSI_PREFIX) ? raw.slice(XSSI_PREFIX.length) : raw
}

export function parseBatchExecuteBody(raw: string): unknown[] {
  const text = stripXssiPrefix(raw).trim()
  const lines = text.split('\n').filter((line) => line.trim().length > 0)
  const chunks: unknown[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const chunkLength = Number(lines[index])
    const jsonLine = lines[index + 1]

    if (Number.isNaN(chunkLength) || !jsonLine) {
      continue
    }

    chunks.push(JSON.parse(jsonLine))
    index += 1
  }

  return chunks
}

export function extractSearchResultAppIds(data: unknown): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  function add(packageId: string) {
    if (!isPackageId(packageId) || seen.has(packageId)) {
      return
    }
    seen.add(packageId)
    ids.push(packageId)
  }
  function walk(node: unknown) {
    if (typeof node === 'string') {
      for (const match of node.matchAll(detailsIdPattern())) {
        add(match[1])
      }
      if (node.startsWith('[') || node.startsWith('{')) {
        try {
          walk(JSON.parse(node))
        } catch {
          // ignore invalid embedded json
        }
      }
      return
    }
    if (!Array.isArray(node)) {
      return
    }
    for (const child of node) {
      walk(child)
    }
  }
  walk(data)
  return ids
}

export function extractSearchResultRanks(data: unknown): SearchResultRank[] {
  return extractSearchResultAppIds(data).map((bundleName, index) => ({
    bundleName,
    place: index + 1,
  }))
}

export function mergeUniquePackageIds(
  existing: string[],
  incoming: string[],
  maxResults = PLAY_STORE_SEARCH_MAX_RESULTS,
): string[] {
  const ids = existing.slice(0, maxResults)
  const seen = new Set(ids)

  for (const packageId of incoming) {
    if (ids.length >= maxResults) {
      break
    }
    if (seen.has(packageId)) {
      continue
    }
    seen.add(packageId)
    ids.push(packageId)
  }

  return ids
}

export function findRankInSearchResponse(
  rawBody: string,
  targetPackageId: string,
): number | null {
  const rank = extractSearchResultRanks(parseBatchExecuteBody(rawBody)).find(
    (item) => item.bundleName === targetPackageId,
  )

  return rank?.place ?? null
}

/** Для отладки: longest nested array (не используем для rank напрямую) */
export function findLongestNestedArray(data: unknown): unknown[] | null {
  let longest: unknown[] | null = null

  function walk(node: unknown) {
    if (Array.isArray(node)) {
      if (!longest || node.length > longest.length) {
        longest = node
      }

      for (const child of node) {
        walk(child)
      }
      return
    }

    if (
      typeof node === 'string' &&
      (node.startsWith('[') || node.startsWith('{'))
    ) {
      try {
        walk(JSON.parse(node))
      } catch {
        // ignore
      }
    }
  }

  walk(data)
  return longest
}
