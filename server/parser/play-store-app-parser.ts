import type { Browser } from 'playwright'
import { extractPlayStoreAppId } from '../../src/lib/play-store-link-validator.ts'
import type { Game } from '../../src/types.ts'

const PLAY_STORE_TITLE_SUFFIX = ' - Apps on Google Play'

function sanitizePlayStoreTitle(pageTitle: string): string {
  const trimmed = pageTitle.trim()
  if (trimmed.endsWith(PLAY_STORE_TITLE_SUFFIX)) {
    return trimmed.slice(0, -PLAY_STORE_TITLE_SUFFIX.length).trim()
  }
  return trimmed
}

export class GooglePlayAppParser {
  private readonly browser: Browser
  constructor(browser: Browser) {
    this.browser = browser
  }
  async fetchApp(url: string): Promise<Game> {
    const page = await this.browser.newPage()
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      const pageTitle = await page.title()
      const name = sanitizePlayStoreTitle(pageTitle)
      const icon =
        (await page
          .locator('img[alt="Icon image"][itemprop="image"]')
          .first()
          .getAttribute('src')) ?? ''
      const shortDescription =
        (await page
          .locator('meta[name="description"]')
          .getAttribute('content')) ?? ''
      const id = extractPlayStoreAppId(url)
      if (!id) {
        throw new Error('Invalid Play Store URL')
      }
      if (!name || !icon) {
        throw new Error('Failed to parse game page')
      }
      return {
        id,
        link: url,
        name,
        icon,
        shortDescription,
      }
    } finally {
      await page.close()
    }
  }
}
