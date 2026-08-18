import { createServer } from 'node:http'
import { Buffer } from 'node:buffer'
import { chromium } from 'playwright'
import { GooglePlayAppParser } from './parser/play-store-app-parser.ts'
import { GoogleRankParser } from './parser/google-rank-parser.ts'
import { createParseJob, getParseJob, runParseJob } from './jobs.ts'
import {
  isValidPlayStoreLink,
  normalizePlayStoreLink,
} from '../src/lib/play-store-link-validator.ts'
import type { Country, Game, Keyword } from '../src/types.ts'

const PORT = 3001

async function readJsonBody(request: import('node:http').IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as unknown) : null
}

function isGame(value: unknown): value is Game {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    value.id.length > 0
  )
}

function isCountry(value: unknown): value is Country {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    value.code.length > 0
  )
}

function isKeywords(value: unknown): value is Keyword[] {
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

function json(
  response: import('node:http').ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const appParser = new GooglePlayAppParser(browser)
  const rankParser = new GoogleRankParser(browser)

  const server = createServer(async (request, response) => {
    const url = request.url ?? ''

    if (request.method === 'POST' && url === '/api/games/fetch') {
      try {
        const body = await readJsonBody(request)
        const link =
          typeof body === 'object' &&
          body !== null &&
          'link' in body &&
          typeof body.link === 'string'
            ? normalizePlayStoreLink(body.link)
            : ''

        if (!isValidPlayStoreLink(link)) {
          json(response, 400, { error: 'Invalid Play Store link' })
          return
        }

        const game = await appParser.fetchApp(link)
        json(response, 200, game)
      } catch (error) {
        json(response, 500, {
          error:
            error instanceof Error ? error.message : 'Failed to fetch game',
        })
      }
      return
    }

    if (request.method === 'POST' && url === '/api/parse') {
      try {
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

        if (!isGame(game) || !isCountry(country) || !isKeywords(keywords)) {
          json(response, 400, { error: 'Invalid parse payload' })
          return
        }

        const job = createParseJob(keywords)
        void runParseJob(job, { game, country, keywords }, rankParser)
        json(response, 200, { jobId: job.id })
      } catch (error) {
        json(response, 500, {
          error:
            error instanceof Error ? error.message : 'Failed to start parse',
        })
      }
      return
    }

    const parseJobMatch = url.match(/^\/api\/parse\/([^/]+)$/)
    if (request.method === 'GET' && parseJobMatch) {
      const job = getParseJob(parseJobMatch[1])
      if (!job) {
        json(response, 404, { error: 'Job not found' })
        return
      }
      json(response, 200, job)
      return
    }

    response.writeHead(404)
    response.end()
  })

  server.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`)
  })

  process.on('SIGINT', async () => {
    await browser.close()
    server.close()
    process.exit(0)
  })
}

main()
