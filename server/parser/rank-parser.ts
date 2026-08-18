export type RankParserGame = {
  id: string
  link: string
  name: string
}

export type RankParserCountry = {
  code: string
  name: string
}

export interface RankParser {
  findRank(
    keyword: string,
    game: RankParserGame,
    country: RankParserCountry,
  ): Promise<number | null>
}
