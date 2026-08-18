import { devices, type Browser, type Page } from 'playwright'
import type {
  RankParser,
  RankParserCountry,
  RankParserGame,
} from './rank-parser.ts'
import {
  extractSearchResultAppIds,
  isPlayStoreBatchExecuteUrl,
  isPlayStoreSearchResultsBatch,
  mergeUniquePackageIds,
  parseBatchExecuteBody,
  PLAY_STORE_SEARCH_MAX_RESULTS,
} from '../lib/play-store-batch-execute.ts'
import {
  buildPlayStoreSearchUrl,
  findRankInAppIds,
} from './play-store-search.ts'

const ANDROID_DEVICE = devices['Pixel 7']
const RESULT_LINK = 'a[href*="/store/apps/details?id="]'
const SHOW_MORE_NAME = /show more|see more|показать ещё|показать еще/i
const MAX_STEPS = 40
const BATCH_WAIT_MS = 4000
const SHOW_MORE_WAIT_MS = 6000
const READ_IDLE_MS = 1500

type BatchQueue = {
  bodies: string[]
  pendingReads: number
}

function createBatchQueue(page: Page): BatchQueue {
  const queue: BatchQueue = { bodies: [], pendingReads: 0 }

  page.on('response', (response) => {
    if (response.status() !== 200) {
      return
    }
    const url = response.url()
    if (!isPlayStoreBatchExecuteUrl(url)) {
      return
    }

    queue.pendingReads += 1
    void response
      .text()
      .then((body) => {
        if (isPlayStoreSearchResultsBatch(url)) {
          queue.bodies.push(body)
        }
      })
      .catch(() => {
        // page may close while response is reading
      })
      .finally(() => {
        queue.pendingReads -= 1
      })
  })

  return queue
}

async function waitForPendingReads(page: Page, queue: BatchQueue) {
  const started = Date.now()
  while (queue.pendingReads > 0 && Date.now() - started < READ_IDLE_MS) {
    await page.waitForTimeout(50)
  }
}

async function waitForNewBatch(
  page: Page,
  queue: BatchQueue,
  previousCount: number,
  timeoutMs: number,
): Promise<boolean> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (queue.bodies.length > previousCount) {
      await waitForPendingReads(page, queue)
      return true
    }
    await page.waitForTimeout(100)
  }
  await waitForPendingReads(page, queue)
  return queue.bodies.length > previousCount
}

function consumeNewBatchBodies(
  queue: BatchQueue,
  consumed: number,
): {
  ids: string[]
  consumed: number
} {
  const ids: string[] = []
  for (let index = consumed; index < queue.bodies.length; index += 1) {
    ids.push(
      ...extractSearchResultAppIds(parseBatchExecuteBody(queue.bodies[index])),
    )
  }
  return { ids, consumed: queue.bodies.length }
}

function showMoreButton(page: Page) {
  return page.getByRole('button', { name: SHOW_MORE_NAME })
}

async function clickShowMoreIfPresent(page: Page): Promise<boolean> {
  const button = showMoreButton(page).last()
  if ((await button.count()) === 0) {
    return false
  }
  if (!(await button.isVisible().catch(() => false))) {
    return false
  }

  try {
    await button.scrollIntoViewIfNeeded()
    await button.click({ timeout: 4000, force: true })
    return true
  } catch {
    return false
  }
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
    let page: Page | null = null

    try {
      page = await this.browser.newPage({
        ...ANDROID_DEVICE,
      })
      const queue = createBatchQueue(page)

      await page.goto(buildPlayStoreSearchUrl(keyword, country.code), {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      await page.locator(RESULT_LINK).first().waitFor({ timeout: 15000 })
      await page.waitForTimeout(500)
      await waitForPendingReads(page, queue)

      let appIds = extractSearchResultAppIds(await page.content())
      let consumed = 0
      const firstPage = consumeNewBatchBodies(queue, consumed)
      consumed = firstPage.consumed
      appIds = mergeUniquePackageIds(appIds, firstPage.ids)

      const rankIfPresent = () => findRankInAppIds(appIds, game.id)
      if (
        rankIfPresent() !== null ||
        appIds.length >= PLAY_STORE_SEARCH_MAX_RESULTS
      ) {
        return rankIfPresent()
      }

      for (let step = 0; step < MAX_STEPS; step += 1) {
        if (appIds.length >= PLAY_STORE_SEARCH_MAX_RESULTS) {
          break
        }

        const previousCount = queue.bodies.length
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        await waitForNewBatch(page, queue, previousCount, BATCH_WAIT_MS)

        const afterScroll = consumeNewBatchBodies(queue, consumed)
        consumed = afterScroll.consumed
        appIds = mergeUniquePackageIds(appIds, afterScroll.ids)

        if (
          rankIfPresent() !== null ||
          appIds.length >= PLAY_STORE_SEARCH_MAX_RESULTS
        ) {
          break
        }

        const beforeClick = queue.bodies.length
        const clicked = await clickShowMoreIfPresent(page)
        if (clicked) {
          await waitForNewBatch(page, queue, beforeClick, SHOW_MORE_WAIT_MS)
          const afterClick = consumeNewBatchBodies(queue, consumed)
          consumed = afterClick.consumed
          appIds = mergeUniquePackageIds(appIds, afterClick.ids)
          if (rankIfPresent() !== null) {
            break
          }
          continue
        }

        if (queue.bodies.length === previousCount) {
          break
        }
      }

      return rankIfPresent()
    } catch (error) {
      console.error(`Google rank parse failed for "${keyword}"`, error)
      throw error
    } finally {
      await page?.close().catch(() => undefined)
    }
  }
}
