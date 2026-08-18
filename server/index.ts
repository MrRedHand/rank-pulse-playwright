import { createServer } from 'node:http'
import { chromium } from 'playwright'
import { GooglePlayAppParser } from './parser/play-store-app-parser.ts'
import {
  isValidPlayStoreLink,
  normalizePlayStoreLink,
} from '../src/lib/play-store-link-validator.ts'
import { Buffer } from 'node:buffer'

const PORT = 3001

async function readJsonBody(request: import('node:http').IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as unknown) : null
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const parser = new GooglePlayAppParser(browser)

  const server = createServer(async (request, response) => {
    if (request.method === 'POST' && request.url === '/api/games/fetch') {
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
          response.writeHead(400, { 'Content-Type': 'application/json' })
          response.end(JSON.stringify({ error: 'Invalid Play Store link' }))
          return
        }

        const game = await parser.fetchApp(link)
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(game))
      } catch (error) {
        response.writeHead(500, { 'Content-Type': 'application/json' })
        response.end(
          JSON.stringify({
            error:
              error instanceof Error ? error.message : 'Failed to fetch game',
          }),
        )
      }
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
