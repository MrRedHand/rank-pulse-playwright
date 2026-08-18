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

export type EnqueueParseResult = 'ok' | 'not-found' | 'not-running'

const jobs = new Map<string, ParseJob>()

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

  return 'ok'
}

export async function runParseJob(
  job: ParseJob,
  input: StartParseInput,
  parser: RankParser,
): Promise<void> {
  try {
    let index = 0
    while (index < job.keywordQueue.length) {
      const keyword = job.keywordQueue[index]
      index += 1
      job.results[keyword.id] = { status: 'parsing', rank: null }

      try {
        const rank = await parser.findRank(
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

export function resetParseJobs() {
  jobs.clear()
}
