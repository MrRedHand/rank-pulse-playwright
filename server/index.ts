import { createServer } from 'node:http'
import { Buffer } from 'node:buffer'
import { chromium } from 'playwright'
import { GooglePlayAppParser } from './parser/play-store-app-parser.ts'
import {
  createParseJob,
  enqueueParseKeywords,
  getParseJob,
  runParseJob,
} from './jobs.ts'
import {
  isValidPlayStoreLink,
  normalizePlayStoreLink,
} from '../src/lib/play-store-link-validator.ts'
import type { Country, Game, Keyword } from '../src/types.ts'
import { GoogleRankParser } from './parser/google-rank-parser.ts'

const PORT = 3001
const HOST = '127.0.0.1'
const MAX_JSON_BODY_BYTES = 1_000_000

class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body too large')
    this.name = 'RequestBodyTooLargeError'
  }
}

async function readJsonBody(request: import('node:http').IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_JSON_BODY_BYTES) {
      request.destroy()
      throw new RequestBodyTooLargeError()
    }
    chunks.push(Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as unknown) : null
}

function hasNonEmptyGameId(value: unknown): value is Game {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    value.id.length > 0
  )
}

function hasNonEmptyCountryCode(value: unknown): value is Country {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    value.code.length > 0
  )
}

function isNonEmptyKeywordList(value: unknown): value is Keyword[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        'value' in item &&
        typeof item.id === 'string' &&
        typeof item.value === 'string',
    )
  )
}

function sendJsonResponse(
  response: import('node:http').ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

function sendErrorResponse(
  response: import('node:http').ServerResponse,
  fallbackMessage: string,
  error: unknown,
) {
  if (error instanceof RequestBodyTooLargeError) {
    sendJsonResponse(response, 413, { error: 'Request body too large' })
    return
  }

  sendJsonResponse(response, 500, { error: fallbackMessage })
}

async function main() {
  let browser = await chromium.launch({ headless: true })
  let appParser = new GooglePlayAppParser(browser)
  let rankParser = new GoogleRankParser(browser)

  async function reconnectBrowserIfDisconnected() {
    if (browser.isConnected()) {
      return
    }

    browser = await chromium.launch({ headless: true })
    appParser = new GooglePlayAppParser(browser)
    rankParser = new GoogleRankParser(browser)
  }

  const server = createServer(async (request, response) => {
    const url = request.url ?? ''

    if (request.method === 'POST' && url === '/api/games/fetch') {
      try {
        await reconnectBrowserIfDisconnected()
        const body = await readJsonBody(request)
        const link =
          typeof body === 'object' &&
          body !== null &&
          'link' in body &&
          typeof body.link === 'string'
            ? normalizePlayStoreLink(body.link)
            : ''

        if (!isValidPlayStoreLink(link)) {
          sendJsonResponse(response, 400, { error: 'Invalid Play Store link' })
          return
        }

        const game = await appParser.fetchApp(link)
        sendJsonResponse(response, 200, game)
      } catch (error) {
        sendErrorResponse(response, 'Failed to fetch game', error)
      }
      return
    }

    if (request.method === 'POST' && url === '/api/parse') {
      try {
        await reconnectBrowserIfDisconnected()
        const body = await readJsonBody(request)
        const game =
          typeof body === 'object' && body !== null && 'game' in body
            ? body.game
            : null
        const country =
          typeof body === 'object' && body !== null && 'country' in body
            ? body.country
            : null
        const keywords =
          typeof body === 'object' && body !== null && 'keywords' in body
            ? body.keywords
            : null

        if (
          !hasNonEmptyGameId(game) ||
          !hasNonEmptyCountryCode(country) ||
          !isNonEmptyKeywordList(keywords)
        ) {
          sendJsonResponse(response, 400, { error: 'Invalid parse payload' })
          return
        }

        const job = createParseJob(keywords)
        void runParseJob(job, { game, country }, () => rankParser)
        sendJsonResponse(response, 200, { jobId: job.id })
      } catch (error) {
        sendErrorResponse(response, 'Failed to start parse', error)
      }
      return
    }

    const appendKeywordsMatch = url.match(/^\/api\/parse\/([^/]+)\/keywords$/)
    if (request.method === 'POST' && appendKeywordsMatch) {
      try {
        const body = await readJsonBody(request)
        const keywords =
          typeof body === 'object' && body !== null && 'keywords' in body
            ? body.keywords
            : null

        if (!isNonEmptyKeywordList(keywords)) {
          sendJsonResponse(response, 400, { error: 'Invalid parse payload' })
          return
        }

        const result = enqueueParseKeywords(appendKeywordsMatch[1], keywords)
        if (result === 'not-found') {
          sendJsonResponse(response, 404, { error: 'Job not found' })
          return
        }
        if (result === 'not-running') {
          sendJsonResponse(response, 409, { error: 'Job is not running' })
          return
        }

        sendJsonResponse(response, 200, { ok: true })
      } catch (error) {
        sendErrorResponse(response, 'Failed to enqueue keywords', error)
      }
      return
    }

    const parseJobMatch = url.match(/^\/api\/parse\/([^/]+)$/)
    if (request.method === 'GET' && parseJobMatch) {
      const job = getParseJob(parseJobMatch[1])
      if (!job) {
        sendJsonResponse(response, 404, { error: 'Job not found' })
        return
      }
      sendJsonResponse(response, 200, job)
      return
    }

    response.writeHead(404)
    response.end()
  })

  server.listen(PORT, HOST, () => {
    console.log(`API server listening on http://${HOST}:${PORT}`)
  })

  process.on('SIGINT', async () => {
    await browser.close()
    server.close()
    process.exit(0)
  })
}

main()
