import type { Browser } from 'playwright'

export type FetchedGame = {
  id: string
  link: string
  name: string
  icon: string
  shortDescription: string
}

export interface PlayStoreAppParser {
  fetchApp(url: string): Promise<FetchedGame>
}

const PLAY_STORE_TITLE_SUFFIX = ' - Apps on Google Play'

function sanitizePlayStoreTitle(pageTitle: string): string {
  const trimmed = pageTitle.trim()
  if (trimmed.endsWith(PLAY_STORE_TITLE_SUFFIX)) {
    return trimmed.slice(0, -PLAY_STORE_TITLE_SUFFIX.length).trim()
  }
  return trimmed
}

function extractPlayStoreAppId(rawUrl: string): string | null {
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

export class GooglePlayAppParser implements PlayStoreAppParser {
  private readonly browser: Browser
  constructor(browser: Browser) {
    this.browser = browser
  }
  async fetchApp(url: string): Promise<FetchedGame> {
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
