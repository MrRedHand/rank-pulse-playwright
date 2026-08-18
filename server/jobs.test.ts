import { describe, expect, it, beforeEach } from 'vitest'
import {
  createParseJob,
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
    await runParseJob(job, { game, country, keywords }, parser)

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
    await runParseJob(job, { game, country, keywords }, parser)

    expect(job.status).toBe('done')
    expect(job.results.k1).toEqual({ status: 'error', rank: null })
    expect(job.results.k2).toEqual({ status: 'done', rank: 4 })
  })
})
