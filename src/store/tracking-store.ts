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
  addSnapshot: (
    gameId: string,
    snapshot: RankSnapshot,
    parsedAt: string,
    countryCode: string,
  ) => void
}

function createTracking(game: Game, country: Country): TrackingData {
  return {
    game,
    country,
    keywords: [],
    historyByCountry: {},
    lastParsedAtByCountry: {},
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

type LegacyTrackingData = Omit<
  TrackingData,
  'historyByCountry' | 'lastParsedAtByCountry'
> & {
  history?: RankSnapshot[]
  lastParsedAt?: string | null
  historyByCountry?: Record<string, RankSnapshot[]>
  lastParsedAtByCountry?: Record<string, string | null>
}

function migrateTrackingData(tracking: LegacyTrackingData): TrackingData {
  if (tracking.historyByCountry && tracking.lastParsedAtByCountry) {
    return {
      game: tracking.game,
      country: tracking.country,
      keywords: tracking.keywords,
      historyByCountry: tracking.historyByCountry,
      lastParsedAtByCountry: tracking.lastParsedAtByCountry,
    }
  }

  const countryCode = tracking.country?.code ?? DEFAULT_COUNTRY.code
  const history = tracking.history ?? []
  const lastParsedAt = tracking.lastParsedAt ?? null

  return {
    game: tracking.game,
    country: tracking.country,
    keywords: tracking.keywords,
    historyByCountry: history.length > 0 ? { [countryCode]: history } : {},
    lastParsedAtByCountry:
      lastParsedAt !== null ? { [countryCode]: lastParsedAt } : {},
  }
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
          updateActiveTracking(state, (activeTracking) => ({
            ...activeTracking,
            country,
          })),
        ),

      setKeywords: (keywords) =>
        set((state) =>
          updateActiveTracking(state, (activeTracking) => ({
            ...activeTracking,
            keywords,
          })),
        ),
      addSnapshot: (gameId, snapshot, parsedAt, countryCode) =>
        set((state) => {
          const tracking = state.trackedGames[gameId]
          if (!tracking) {
            return {}
          }

          const history = tracking.historyByCountry[countryCode] ?? []

          return {
            trackedGames: {
              ...state.trackedGames,
              [gameId]: {
                ...tracking,
                historyByCountry: {
                  ...tracking.historyByCountry,
                  [countryCode]: upsertSnapshot(history, snapshot),
                },
                lastParsedAtByCountry: {
                  ...tracking.lastParsedAtByCountry,
                  [countryCode]: parsedAt,
                },
              },
            },
          }
        }),
    }),
    {
      name: 'rankpulse-tracking',
      partialize: (state) => ({
        trackedGames: state.trackedGames,
        activeGameId: state.activeGameId,
      }),
      version: 2,
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== 'object') {
          return { trackedGames: {}, activeGameId: null }
        }

        if (version === 0) {
          const old = persisted as { tracking?: LegacyTrackingData | null }
          if (!old.tracking) {
            return { trackedGames: {}, activeGameId: null }
          }

          return {
            trackedGames: {
              [old.tracking.game.id]: migrateTrackingData(old.tracking),
            },
            activeGameId: old.tracking.game.id,
          }
        }

        const state = persisted as {
          trackedGames?: Record<string, LegacyTrackingData>
          activeGameId?: string | null
        }

        return {
          trackedGames: Object.fromEntries(
            Object.entries(state.trackedGames ?? {}).map(
              ([gameId, tracking]) => [gameId, migrateTrackingData(tracking)],
            ),
          ),
          activeGameId: state.activeGameId ?? null,
        }
      },
    },
  ),
)
