const PLAY_STORE_BATCH_EXECUTE_PATH = '/_/PlayStoreUi/data/batchexecute'
const XSSI_PREFIX = ")]}'"

const PACKAGE_ID_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/
const DETAILS_ID_RE =
  /(?:\/store\/apps\/details\?id=)([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,})/g

function isPackageId(value: string): boolean {
  return PACKAGE_ID_RE.test(value)
}

export function isPlayStoreBatchExecuteUrl(url: string): boolean {
  return url.includes(PLAY_STORE_BATCH_EXECUTE_PATH)
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
      for (const match of node.matchAll(DETAILS_ID_RE)) {
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

export function findRankInSearchResponse(
  rawBody: string,
  targetPackageId: string,
): number | null {
  const chunks = parseBatchExecuteBody(rawBody)
  const appIds = extractSearchResultAppIds(chunks)
  const index = appIds.indexOf(targetPackageId)

  if (index === -1) {
    return null
  }

  return index + 1
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
