import { apiGet, apiPost } from './client'
import type { Country, Game, Keyword, ParseJob } from '../types'

export type StartParseInput = {
  game: Game
  country: Country
  keywords: Keyword[]
}

export function startParse(input: StartParseInput): Promise<{ jobId: string }> {
  return apiPost('/api/parse', input)
}

export function fetchParseJob(jobId: string): Promise<ParseJob> {
  return apiGet(`/api/parse/${jobId}`)
}
