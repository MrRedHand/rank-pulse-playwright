import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  extractSearchResultAppIds,
  extractSearchResultRanks,
  findRankInSearchResponse,
  isPlayStoreSearchResultsBatch,
  mergeUniquePackageIds,
  parseBatchExecuteBody,
} from './play-store-batch-execute.ts'

const TARGET_PACKAGE_ID = 'com.king.candycrushsaga'
const MIXED_CASE_PACKAGE_ID = 'com.goolny.Split2048'

const fixtureDir = dirname(fileURLToPath(import.meta.url))

function readFixtureBody(): string {
  return readFileSync(
    join(fixtureDir, '../fixtures/play-store-search-response.txt'),
    'utf8',
  )
}

function batchBodyWithDetailsUrl(packageId: string): string {
  const nested = JSON.stringify([
    `https://play.google.com/store/apps/details?id=${packageId}`,
  ])
  const chunk = JSON.stringify([
    ['wrb.fr', 'lGYRle', nested, null, null, null, '1'],
  ])
  return `)]}'\n\n${chunk.length}\n${chunk}\n`
}

describe('play-store batch execute', () => {
  it('parses the example search response and finds the game rank', () => {
    const body = readFixtureBody()
    const chunks = parseBatchExecuteBody(body)
    const ids = extractSearchResultAppIds(chunks)
    const ranks = extractSearchResultRanks(chunks)
    const rank = findRankInSearchResponse(body, TARGET_PACKAGE_ID)

    expect(chunks.length).toBeGreaterThan(0)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids).toContain(TARGET_PACKAGE_ID)
    expect(new Set(ids).size).toBe(ids.length)

    expect(ranks).toHaveLength(ids.length)
    expect(ranks[0]).toEqual({ bundleName: ids[0], place: 1 })
    expect(ranks.at(-1)).toEqual({
      bundleName: ids[ids.length - 1],
      place: ids.length,
    })
    expect(new Set(ranks.map((item) => item.bundleName)).size).toBe(
      ranks.length,
    )

    expect(rank).not.toBeNull()
    expect(rank).toBeGreaterThan(0)
    expect(rank).toBe(ids.indexOf(TARGET_PACKAGE_ID) + 1)
    expect(
      ranks.find((item) => item.bundleName === TARGET_PACKAGE_ID)?.place,
    ).toBe(rank)
  })

  it('returns null when the game is not in the response', () => {
    const rank = findRankInSearchResponse(
      readFixtureBody(),
      'com.example.missing.app',
    )

    expect(rank).toBeNull()
  })

  it('extracts mixed-case package ids from details urls', () => {
    const body = batchBodyWithDetailsUrl(MIXED_CASE_PACKAGE_ID)
    const ranks = extractSearchResultRanks(parseBatchExecuteBody(body))

    expect(ranks).toEqual([{ bundleName: MIXED_CASE_PACKAGE_ID, place: 1 }])
    expect(findRankInSearchResponse(body, MIXED_CASE_PACKAGE_ID)).toBe(1)
  })

  it('accepts search-result batchexecute rpc ids and skips suggestions', () => {
    const searchUrl =
      'https://play.google.com/_/PlayStoreUi/data/batchexecute?rpcids=lGYRle'
    const pageUrl =
      'https://play.google.com/_/PlayStoreUi/data/batchexecute?rpcids=qnKhOb'
    const suggestUrl =
      'https://play.google.com/_/PlayStoreUi/data/batchexecute?rpcids=teXCtc'

    expect(isPlayStoreSearchResultsBatch(searchUrl, 'short')).toBe(true)
    expect(isPlayStoreSearchResultsBatch(pageUrl, 'short')).toBe(true)
    expect(isPlayStoreSearchResultsBatch(suggestUrl, 'short')).toBe(false)
    expect(isPlayStoreSearchResultsBatch(suggestUrl, 'x'.repeat(12_000))).toBe(
      true,
    )
    expect(
      isPlayStoreSearchResultsBatch(
        'https://play.google.com/store/search',
        'x',
      ),
    ).toBe(false)
  })

  it('merges package ids in first-seen order without duplicates', () => {
    expect(
      mergeUniquePackageIds(
        ['com.a.app.one', 'com.b.app.two'],
        ['com.b.app.two', 'com.c.app.three'],
      ),
    ).toEqual(['com.a.app.one', 'com.b.app.two', 'com.c.app.three'])
  })
})
