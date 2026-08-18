import type { Browser } from 'playwright'
import type {
  RankParser,
  RankParserCountry,
  RankParserGame,
} from './rank-parser.ts'
import {
  findRankInSearchResponse,
  isPlayStoreBatchExecuteUrl,
} from '../lib/play-store-batch-execute.ts'

function buildPlayStoreSearchUrl(keyword: string, countryCode: string): string {
  const params = new URLSearchParams({
    q: keyword,
    c: 'apps',
    hl: 'en',
    gl: countryCode,
  })

  return `https://play.google.com/store/search?${params.toString()}`
}

export class GoogleRankParser implements RankParser {
  private readonly browser: Browser

  constructor(browser: Browser) {
    this.browser = browser
  }

  async findRank(
    keyword: string,
    game: RankParserGame,
    country: RankParserCountry,
  ): Promise<number | null> {
    const page = await this.browser.newPage()
    let largestBatchBody: string | null = null

    page.on('response', async (response) => {
      if (!isPlayStoreBatchExecuteUrl(response.url())) {
        return
      }

      try {
        const body = await response.text()
        if (!largestBatchBody || body.length > largestBatchBody.length) {
          largestBatchBody = body
        }
      } catch {
        // page may close while response is reading
      }
    })

    try {
      const searchUrl = buildPlayStoreSearchUrl(keyword, country.code)

      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })

      // дать странице время на batchexecute после goto
      await page
        .waitForResponse(
          (response) =>
            isPlayStoreBatchExecuteUrl(response.url()) &&
            response.status() === 200,
          { timeout: 15000 },
        )
        .catch(() => null)

      // иногда приходит несколько batch-ответов — короткая пауза
      await page.waitForTimeout(1500)

      if (!largestBatchBody) {
        return null
      }

      return findRankInSearchResponse(largestBatchBody, game.id)
    } finally {
      await page.close()
    }
  }
}
