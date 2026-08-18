import type {
  Country,
  Game,
  Keyword,
  KeywordParseResult,
  ParseJob,
} from '../src/types.ts'
import type { RankParser } from './parser/rank-parser.ts'

export type StartParseInput = {
  game: Game
  country: Country
}

export type EnqueueParseResult = 'enqueued' | 'not-found' | 'not-running'

const jobs = new Map<string, ParseJob>()
let parseChain: Promise<void> = Promise.resolve()

export function getParseJob(jobId: string): ParseJob | null {
  return jobs.get(jobId) ?? null
}

export function createParseJob(
  keywords: Keyword[],
  jobId = crypto.randomUUID(),
): ParseJob {
  const results: Record<string, KeywordParseResult> = {}

  for (const keyword of keywords) {
    results[keyword.id] = { status: 'pending', rank: null }
  }

  const job: ParseJob = {
    id: jobId,
    status: 'running',
    results,
    keywordQueue: [...keywords],
  }

  jobs.set(job.id, job)
  return job
}

export function enqueueParseKeywords(
  jobId: string,
  keywords: Keyword[],
): EnqueueParseResult {
  const job = jobs.get(jobId)
  if (!job) {
    return 'not-found'
  }
  if (job.status !== 'running') {
    return 'not-running'
  }

  for (const keyword of keywords) {
    const existing = job.results[keyword.id]
    if (existing?.status === 'pending' || existing?.status === 'parsing') {
      continue
    }

    job.results[keyword.id] = { status: 'pending', rank: null }
    job.keywordQueue.push(keyword)
  }

  return 'enqueued'
}

export async function runParseJob(
  job: ParseJob,
  input: StartParseInput,
  parser: RankParser | (() => RankParser),
): Promise<void> {
  const execute = async () => {
    const rankParser = typeof parser === 'function' ? parser() : parser

    try {
      let index = 0
      while (index < job.keywordQueue.length) {
        const keyword = job.keywordQueue[index]
        index += 1
        job.results[keyword.id] = { status: 'parsing', rank: null }

        try {
          const rank = await rankParser.findRank(
            keyword.value,
            input.game,
            input.country,
          )
          job.results[keyword.id] = { status: 'done', rank }
        } catch (error) {
          console.error(`Rank parse failed for "${keyword.value}"`, error)
          job.results[keyword.id] = { status: 'error', rank: null }
        }
      }

      job.status = 'done'
    } catch (error) {
      console.error('Parse job failed', error)
      job.status = 'error'
    }
  }

  const queued = parseChain.then(execute, execute)
  parseChain = queued.then(
    () => undefined,
    () => undefined,
  )
  return queued
}

export function resetParseJobs() {
  jobs.clear()
  parseChain = Promise.resolve()
}
