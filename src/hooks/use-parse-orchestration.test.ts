import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useParseOrchestration } from './use-parse-orchestration'
import { useTrackingStore } from '../store/tracking-store'
import { appendParseKeywords, fetchParseJob, startParse } from '../api/parse'
import { ApiError } from '../api/client'
import type { Game, Keyword, ParseJob, TrackingData } from '../types'

vi.mock('../api/parse', () => ({
  startParse: vi.fn(),
  appendParseKeywords: vi.fn(),
  fetchParseJob: vi.fn(),
}))

const country = { code: 'us', name: 'United States' }
const keywords: Keyword[] = [{ id: 'k1', value: 'puzzle' }]

function game(id: string): Game {
  return {
    id,
    link: `https://play.google.com/store/apps/details?id=${id}`,
    name: id,
    icon: '',
    shortDescription: '',
  }
}

function trackingFor(id: string): TrackingData {
  return {
    game: game(id),
    country,
    keywords,
    historyByCountry: {},
    lastParsedAtByCountry: {},
  }
}

function wrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
}

function doneJob(jobId: string, rank = 3): ParseJob {
  return {
    id: jobId,
    status: 'done',
    results: { k1: { status: 'done', rank } },
    keywordQueue: keywords,
  }
}

describe('useParseOrchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useTrackingStore.setState({
      trackedGames: {
        'game.a': trackingFor('game.a'),
        'game.b': trackingFor('game.b'),
      },
      activeGameId: 'game.a',
    })
  })

  it('persists a finished job onto the originating game after switching games', async () => {
    let resolveFetch: ((job: ParseJob) => void) | undefined
    vi.mocked(startParse).mockResolvedValue({ jobId: 'job-a' })
    vi.mocked(fetchParseJob).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    const { result } = renderHook(() => useParseOrchestration(), {
      wrapper: wrapper(),
    })

    act(() => {
      result.current.startParseForKeywords(keywords)
    })

    await waitFor(() => {
      expect(startParse).toHaveBeenCalledOnce()
    })

    act(() => {
      useTrackingStore.getState().selectGame('game.b')
    })

    await waitFor(() => {
      expect(fetchParseJob).toHaveBeenCalledWith('job-a')
    })

    act(() => {
      resolveFetch?.(doneJob('job-a', 7))
    })

    await waitFor(() => {
      expect(
        useTrackingStore.getState().trackedGames['game.a'].historyByCountry.us,
      ).toEqual([
        {
          date: expect.any(String),
          results: { k1: 7 },
        },
      ])
    })

    expect(
      useTrackingStore.getState().trackedGames['game.b'].historyByCountry.us,
    ).toBeUndefined()
  })

  it('starts a new job when appending keywords returns 409', async () => {
    vi.mocked(startParse)
      .mockResolvedValueOnce({ jobId: 'job-1' })
      .mockResolvedValueOnce({ jobId: 'job-2' })
    vi.mocked(fetchParseJob).mockResolvedValue({
      id: 'job-1',
      status: 'running',
      results: { k1: { status: 'parsing', rank: null } },
      keywordQueue: keywords,
    })
    vi.mocked(appendParseKeywords).mockRejectedValue(
      new ApiError('Job is not running', 409),
    )

    const extraKeyword: Keyword = { id: 'k2', value: 'arcade' }
    useTrackingStore.setState((state) => ({
      trackedGames: {
        ...state.trackedGames,
        'game.a': {
          ...state.trackedGames['game.a'],
          keywords: [...keywords, extraKeyword],
        },
      },
    }))

    const { result } = renderHook(() => useParseOrchestration(), {
      wrapper: wrapper(),
    })

    act(() => {
      result.current.startParseForKeywords(keywords)
    })

    await waitFor(() => {
      expect(result.current.job?.id).toBe('job-1')
    })

    act(() => {
      result.current.refreshKeyword('k2')
    })

    await waitFor(() => {
      expect(startParse).toHaveBeenCalledTimes(2)
    })

    expect(vi.mocked(startParse).mock.calls.at(-1)?.[0]).toEqual({
      game: game('game.a'),
      country,
      keywords: [extraKeyword],
    })
  })
})
