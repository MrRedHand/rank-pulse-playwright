import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  extractSearchResultAppIds,
  findRankInSearchResponse,
  parseBatchExecuteBody,
} from './play-store-batch-execute.ts'

const TARGET_PACKAGE_ID = 'com.king.candycrushsaga'

const fixtureDir = dirname(fileURLToPath(import.meta.url))

function readFixtureBody(): string {
  return readFileSync(
    join(fixtureDir, '../fixtures/play-store-search-response.txt'),
    'utf8',
  )
}

describe('play-store batch execute', () => {
  it('parses the example search response and finds the game rank', () => {
    const body = readFixtureBody()
    const chunks = parseBatchExecuteBody(body)
    const ids = extractSearchResultAppIds(chunks)
    const rank = findRankInSearchResponse(body, TARGET_PACKAGE_ID)

    expect(chunks.length).toBeGreaterThan(0)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids).toContain(TARGET_PACKAGE_ID)
    expect(new Set(ids).size).toBe(ids.length)

    expect(rank).not.toBeNull()
    expect(rank).toBeGreaterThan(0)
    expect(rank).toBe(ids.indexOf(TARGET_PACKAGE_ID) + 1)
  })

  it('returns null when the game is not in the response', () => {
    const rank = findRankInSearchResponse(
      readFixtureBody(),
      'com.example.missing.app',
    )

    expect(rank).toBeNull()
  })
})
