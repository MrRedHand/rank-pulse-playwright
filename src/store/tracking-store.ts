import { create } from 'zustand'
import type {
  Country,
  Game,
  Keyword,
  RankSnapshot,
  TrackingData,
} from '../types'
import { persist } from 'zustand/middleware'
import { DEFAULT_COUNTRY } from '../lib/countries'
import { upsertSnapshot } from '../lib/snapshots'

type TrackingStore = {
  trackedGames: Record<string, TrackingData>
  activeGameId: string | null
  addGame: (game: Game) => void
  selectGame: (gameId: string) => void
  setCountry: (country: Country) => void
  setKeywords: (keywords: Keyword[]) => void
  addSnapshot: (snapshot: RankSnapshot, parsedAt: string) => void
}

function createTracking(game: Game, country: Country): TrackingData {
  return {
    game,
    country,
    keywords: [],
    history: [],
    lastParsedAt: null,
  }
}

function updateActiveTracking(
  state: Pick<TrackingStore, 'trackedGames' | 'activeGameId'>,
  updater: (tracking: TrackingData) => TrackingData,
) {
  const { activeGameId, trackedGames } = state
  if (!activeGameId || !trackedGames[activeGameId]) {
    return {}
  }

  return {
    trackedGames: {
      ...trackedGames,
      [activeGameId]: updater(trackedGames[activeGameId]),
    },
  }
}

export function selectActiveTracking(
  state: Pick<TrackingStore, 'trackedGames' | 'activeGameId'>,
): TrackingData | null {
  if (!state.activeGameId) {
    return null
  }
  return state.trackedGames[state.activeGameId] ?? null
}

export const useTrackingStore = create<TrackingStore>()(
  persist(
    (set) => ({
      trackedGames: {},
      activeGameId: null,

      addGame: (game) =>
        set((state) => {
          const existingGame = state.trackedGames[game.id]

          if (existingGame) {
            return {
              activeGameId: game.id,
              trackedGames: {
                ...state.trackedGames,
                [game.id]: { ...existingGame, game },
              },
            }
          }

          return {
            activeGameId: game.id,
            trackedGames: {
              ...state.trackedGames,
              [game.id]: createTracking(game, DEFAULT_COUNTRY),
            },
          }
        }),

      selectGame: (gameId) =>
        set((state) =>
          state.trackedGames[gameId] ? { activeGameId: gameId } : state,
        ),

      setCountry: (country) =>
        set((state) =>
          updateActiveTracking(state, (singleTrackedGame) => ({
            ...singleTrackedGame,
            country,
          })),
        ),

      setKeywords: (keywords) =>
        set((state) =>
          updateActiveTracking(state, (singleTrackedGame) => ({
            ...singleTrackedGame,
            keywords,
          })),
        ),
      addSnapshot: (snapshot, parsedAt) =>
        set((state) =>
          updateActiveTracking(state, (singleTrackedGame) => ({
            ...singleTrackedGame,
            history: upsertSnapshot(singleTrackedGame.history, snapshot),
            lastParsedAt: parsedAt,
          })),
        ),
    }),
    {
      name: 'rankpulse-tracking',
      partialize: (state) => ({
        trackedGames: state.trackedGames,
        activeGameId: state.activeGameId,
      }),
      version: 1,
      migrate: (persisted, version) => {
        if (version === 0 && persisted && typeof persisted === 'object') {
          const old = persisted as { tracking?: TrackingData | null }
          if (!old.tracking) {
            return { trackedGames: {}, activeGameId: null }
          }
          return {
            trackedGames: { [old.tracking.game.id]: old.tracking },
            activeGameId: old.tracking.game.id,
          }
        }
        return persisted as Pick<TrackingStore, 'trackedGames' | 'activeGameId'>
      },
    },
  ),
)
