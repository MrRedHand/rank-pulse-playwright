import { describe, expect, it, beforeEach } from 'vitest'
import {
  createParseJob,
  enqueueParseKeywords,
  getParseJob,
  resetParseJobs,
  runParseJob,
} from './jobs.ts'
import type { RankParser } from './parser/rank-parser.ts'

const game = {
  id: 'com.king.candycrushsaga',
  link: 'https://play.google.com/store/apps/details?id=com.king.candycrushsaga',
  name: 'Candy Crush Saga',
  icon: '',
  shortDescription: '',
}

const country = { code: 'us', name: 'United States' }

const keywords = [
  { id: 'k1', value: 'candy crush' },
  { id: 'k2', value: 'match 3' },
]

beforeEach(() => {
  resetParseJobs()
})

describe('parse jobs', () => {
  it('parses keywords sequentially and records ranks', async () => {
    const seen: string[] = []
    const parser: RankParser = {
      async findRank(keyword) {
        seen.push(keyword)
        return seen.length
      },
    }

    const job = createParseJob(keywords)
    await runParseJob(job, { game, country }, parser)

    expect(seen).toEqual(['candy crush', 'match 3'])
    expect(job.status).toBe('done')
    expect(job.results.k1).toEqual({ status: 'done', rank: 1 })
    expect(job.results.k2).toEqual({ status: 'done', rank: 2 })
    expect(getParseJob(job.id)?.status).toBe('done')
  })

  it('marks a keyword as error and continues', async () => {
    const parser: RankParser = {
      async findRank(keyword) {
        if (keyword === 'candy crush') {
          throw new Error('blocked')
        }
        return 4
      },
    }

    const job = createParseJob(keywords)
    await runParseJob(job, { game, country }, parser)

    expect(job.status).toBe('done')
    expect(job.results.k1).toEqual({ status: 'error', rank: null })
    expect(job.results.k2).toEqual({ status: 'done', rank: 4 })
  })

  it('parses keywords enqueued while the job is running', async () => {
    let releaseFirst = () => {}
    let startedFirst = () => {}
    const firstStarted = new Promise<void>((resolve) => {
      startedFirst = resolve
    })
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const seen: string[] = []

    const parser: RankParser = {
      async findRank(keyword) {
        seen.push(keyword)
        if (keyword === 'candy crush') {
          startedFirst()
          await firstGate
        }
        return seen.length
      },
    }

    const job = createParseJob([keywords[0]])
    const running = runParseJob(job, { game, country }, parser)
    await firstStarted

    expect(enqueueParseKeywords(job.id, [keywords[1]])).toBe('enqueued')
    expect(job.results.k2).toEqual({ status: 'pending', rank: null })

    releaseFirst()
    await running

    expect(seen).toEqual(['candy crush', 'match 3'])
    expect(job.status).toBe('done')
    expect(job.results.k1).toEqual({ status: 'done', rank: 1 })
    expect(job.results.k2).toEqual({ status: 'done', rank: 2 })
  })

  it('rejects enqueue when the job is not running', async () => {
    const parser: RankParser = {
      async findRank() {
        return 1
      },
    }
    const job = createParseJob([keywords[0]])
    await runParseJob(job, { game, country }, parser)

    expect(enqueueParseKeywords(job.id, [keywords[1]])).toBe('not-running')
    expect(enqueueParseKeywords('missing', [keywords[1]])).toBe('not-found')
  })

  it('records null rank as done, not error', async () => {
    const parser: RankParser = {
      async findRank() {
        return null
      },
    }

    const job = createParseJob([keywords[0]])
    await runParseJob(job, { game, country }, parser)

    expect(job.status).toBe('done')
    expect(job.results.k1).toEqual({ status: 'done', rank: null })
  })

  it('runs parse jobs one at a time', async () => {
    let concurrent = 0
    let maxConcurrent = 0
    const parser: RankParser = {
      async findRank() {
        concurrent += 1
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await new Promise((resolve) => {
          setTimeout(resolve, 20)
        })
        concurrent -= 1
        return 1
      },
    }

    const firstJob = createParseJob([keywords[0]])
    const secondJob = createParseJob([keywords[1]])
    await Promise.all([
      runParseJob(firstJob, { game, country }, parser),
      runParseJob(secondJob, { game, country }, parser),
    ])

    expect(maxConcurrent).toBe(1)
    expect(firstJob.status).toBe('done')
    expect(secondJob.status).toBe('done')
  })
})
