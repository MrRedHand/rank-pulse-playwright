import { apiPost } from './client'
import type { Game } from '../types'

export async function fetchGameByLink(link: string): Promise<Game> {
  return apiPost<Game>('/api/games/fetch', { link })
}
