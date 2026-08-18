import { devices, type Browser, type Page } from 'playwright'
import type {
  RankParser,
  RankParserCountry,
  RankParserGame,
} from './rank-parser.ts'
import {
  buildPlayStoreSearchUrl,
  findRankInAppIds,
  uniqueAppIdsFromHrefs,
} from './play-store-search.ts'

const ANDROID_DEVICE = devices['Pixel 7']
const RESULT_LINK = 'a[href*="/store/apps/details?id="]'
const MAX_SCROLLS = 8

async function collectResultHrefs(page: Page): Promise<string[]> {
  await page.locator(RESULT_LINK).first().waitFor({ timeout: 15000 })

  let previousUnique = 0

  for (let scroll = 0; scroll < MAX_SCROLLS; scroll += 1) {
    const hrefs = await page
      .locator(RESULT_LINK)
      .evaluateAll((anchors) =>
        anchors.map((anchor) => anchor.getAttribute('href') ?? ''),
      )
    const uniqueCount = uniqueAppIdsFromHrefs(hrefs).length

    if (scroll > 0 && uniqueCount === previousUnique) {
      break
    }

    previousUnique = uniqueCount
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
    await page.waitForTimeout(800)
  }

  return page
    .locator(RESULT_LINK)
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute('href') ?? ''),
    )
}

export class GoogleDomRankParser implements RankParser {
  private readonly browser: Browser

  constructor(browser: Browser) {
    this.browser = browser
  }

  async findRank(
    keyword: string,
    game: RankParserGame,
    country: RankParserCountry,
  ): Promise<number | null> {
    const page = await this.browser.newPage({
      ...ANDROID_DEVICE,
    })

    try {
      await page.goto(buildPlayStoreSearchUrl(keyword, country.code), {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })

      const hrefs = await collectResultHrefs(page)
      const appIds = uniqueAppIdsFromHrefs(hrefs)

      return findRankInAppIds(appIds, game.id)
    } catch {
      return null
    } finally {
      await page.close()
    }
  }
}
