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
  keywords: Keyword[]
}

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
  }

  jobs.set(job.id, job)
  return job
}

export async function runParseJob(
  job: ParseJob,
  input: StartParseInput,
  parser: RankParser,
): Promise<void> {
  try {
    for (const keyword of input.keywords) {
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
