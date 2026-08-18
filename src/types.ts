export type Game = {
  id: string
  link: string
  name: string
  icon: string
  shortDescription: string
}

export type Country = {
  code: string
  name: string
}

export type Keyword = {
  id: string
  value: string
}

export type RankSnapshot = {
  date: string
  results: Record<string, number | null>
}

export type TrackingData = {
  game: Game
  country: Country
  keywords: Keyword[]
  history: RankSnapshot[]
  lastParsedAt: string | null
}

export type TrackingCollection = {
  trackedGames: Record<string, TrackingData>
  activeGameId: string | null
}

export type KeywordParseStatus = 'pending' | 'parsing' | 'done' | 'error'

export type KeywordParseResult = {
  status: KeywordParseStatus
  rank: number | null
}

export type ParseJob = {
  id: string
  status: 'running' | 'done' | 'error'
  results: Record<string, KeywordParseResult>
}
