import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { selectActiveTracking, useTrackingStore } from '../store/tracking-store'
import { useStartParse } from './use-start-parse'
import { snapshotFromJob, snapshotsForCountry } from '../lib/snapshots'
import { getLocalDateString } from '../lib/dates'
import { appendParseKeywords, fetchParseJob } from '../api/parse'
import { ApiError } from '../api/client'
import { isKeywordParseBusy } from '../lib/rank-table'
import type { Country, Keyword, ParseJob } from '../types'

type BoundParseJob = {
  jobId: string
  gameId: string
  country: Country
}

type QueuedKeywords = {
  gameId: string
  countryCode: string
  ids: string[]
}

export function useParseOrchestration() {
  const activeTracking = useTrackingStore(selectActiveTracking)
  const addSnapshot = useTrackingStore((state) => state.addSnapshot)
  const queryClient = useQueryClient()

  const [jobsByGameId, setJobsByGameId] = useState<
    Record<string, BoundParseJob>
  >({})
  const [isWaitingForJobId, setIsWaitingForJobId] = useState(false)
  const [waitingGameId, setWaitingGameId] = useState<string | null>(null)
  const [queuedKeywords, setQueuedKeywords] = useState<QueuedKeywords | null>(
    null,
  )
  const [isAppendError, setIsAppendError] = useState(false)

  const keywordsQueuedBeforeJobIdRef = useRef<Keyword[]>([])
  const queuedKeywordsRef = useRef<QueuedKeywords | null>(null)
  const jobsByGameIdRef = useRef(jobsByGameId)
  const persistedJobIdsRef = useRef(new Set<string>())

  const {
    mutate: startParseMutate,
    isPending: isStartParsePending,
    isError: isStartParseError,
  } = useStartParse()

  const activeGameId = activeTracking?.game.id ?? null
  const activeCountryCode = activeTracking?.country.code ?? null
  const boundParseJob = activeGameId
    ? (jobsByGameId[activeGameId] ?? null)
    : null
  const boundJobs = Object.values(jobsByGameId)

  const jobQueries = useQueries({
    queries: boundJobs.map((bound) => ({
      queryKey: ['parse-job', bound.jobId] as const,
      queryFn: () => fetchParseJob(bound.jobId),
      refetchInterval: (query: { state: { data?: ParseJob } }) =>
        query.state.data?.status === 'running' ? 1500 : false,
    })),
  })

  const waitingJobId =
    waitingGameId !== null ? jobsByGameId[waitingGameId]?.jobId : undefined
  const waitingQuery = boundJobs.findIndex(
    (bound) => bound.jobId === waitingJobId,
  )
  const waitingJob =
    waitingQuery >= 0 ? jobQueries[waitingQuery]?.data : undefined
  const isWaitingJobQueryError =
    waitingQuery >= 0 ? Boolean(jobQueries[waitingQuery]?.isError) : false

  if (isWaitingForJobId && waitingJobId && waitingJob?.id === waitingJobId) {
    setIsWaitingForJobId(false)
  } else if (isWaitingForJobId && isWaitingJobQueryError) {
    setIsWaitingForJobId(false)
  }

  useEffect(() => {
    jobsByGameIdRef.current = jobsByGameId
  }, [jobsByGameId])

  useEffect(() => {
    queuedKeywordsRef.current = queuedKeywords
  }, [queuedKeywords])

  useEffect(() => {
    for (let index = 0; index < boundJobs.length; index += 1) {
      const bound = boundJobs[index]
      const job = jobQueries[index]?.data
      if (!job || (job.status !== 'done' && job.status !== 'error')) {
        continue
      }
      if (persistedJobIdsRef.current.has(job.id)) {
        continue
      }

      persistedJobIdsRef.current.add(job.id)
      keywordsQueuedBeforeJobIdRef.current = []
      const tracking = useTrackingStore.getState().trackedGames[bound.gameId]
      const today = getLocalDateString()
      const history = snapshotsForCountry(
        tracking?.historyByCountry ?? {},
        bound.country.code,
      )
      const base = history.find((snapshot) => snapshot.date === today)
      addSnapshot(
        bound.gameId,
        snapshotFromJob(job, today, base),
        new Date().toISOString(),
        bound.country.code,
      )
    }
  }, [addSnapshot, boundJobs, jobQueries])

  const displayedJobIndex = boundJobs.findIndex(
    (bound) => bound.jobId === boundParseJob?.jobId,
  )
  const displayedJob =
    displayedJobIndex >= 0
      ? (jobQueries[displayedJobIndex]?.data ?? null)
      : null
  const isPollError =
    displayedJobIndex >= 0
      ? Boolean(jobQueries[displayedJobIndex]?.isError)
      : false

  const jobForTable =
    boundParseJob &&
    boundParseJob.gameId === activeGameId &&
    boundParseJob.country.code === activeCountryCode
      ? displayedJob
      : null

  const isParsing =
    (isWaitingForJobId && waitingGameId === activeGameId) ||
    (isStartParsePending && waitingGameId === activeGameId) ||
    jobForTable?.status === 'running'

  const pendingKeywordIds = useMemo(() => {
    if (
      !queuedKeywords ||
      queuedKeywords.gameId !== activeGameId ||
      queuedKeywords.countryCode !== activeCountryCode
    ) {
      return []
    }

    return queuedKeywords.ids.filter((id) => !jobForTable?.results[id])
  }, [queuedKeywords, activeGameId, activeCountryCode, jobForTable])

  const markKeywordsQueued = useCallback(
    (gameId: string, countryCode: string, keywords: Keyword[]) => {
      const ids = keywords.map((keyword) => keyword.id)
      const current = queuedKeywordsRef.current
      const nextIds =
        current &&
        current.gameId === gameId &&
        current.countryCode === countryCode
          ? [...current.ids]
          : []

      for (const id of ids) {
        if (!nextIds.includes(id)) {
          nextIds.push(id)
        }
      }

      const next = { gameId, countryCode, ids: nextIds }
      queuedKeywordsRef.current = next
      setQueuedKeywords(next)
    },
    [],
  )

  const enqueueOnJob = useCallback(
    async (targetJobId: string, keywords: Keyword[]) => {
      const bound =
        Object.values(jobsByGameIdRef.current).find(
          (item) => item.jobId === targetJobId,
        ) ?? null
      if (!bound) {
        return
      }

      setIsAppendError(false)
      markKeywordsQueued(bound.gameId, bound.country.code, keywords)
      try {
        await appendParseKeywords(targetJobId, keywords)
        await queryClient.invalidateQueries({
          queryKey: ['parse-job', targetJobId],
        })
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          keywordsQueuedBeforeJobIdRef.current = keywords
          setIsWaitingForJobId(true)
          setWaitingGameId(bound.gameId)
          setJobsByGameId((current) => {
            const next = { ...current }
            delete next[bound.gameId]
            jobsByGameIdRef.current = next
            return next
          })
          const tracking =
            useTrackingStore.getState().trackedGames[bound.gameId]
          if (!tracking) {
            setIsWaitingForJobId(false)
            return
          }
          startParseMutate(
            {
              game: tracking.game,
              country: bound.country,
              keywords,
            },
            {
              onSuccess: ({ jobId: nextJobId }) => {
                const nextBound = {
                  jobId: nextJobId,
                  gameId: bound.gameId,
                  country: bound.country,
                }
                setJobsByGameId((current) => {
                  const next = {
                    ...current,
                    [bound.gameId]: nextBound,
                  }
                  jobsByGameIdRef.current = next
                  return next
                })
              },
              onError: () => {
                setIsWaitingForJobId(false)
              },
            },
          )
          return
        }

        setIsAppendError(true)
        const failedIds = new Set(keywords.map((keyword) => keyword.id))
        const current = queuedKeywordsRef.current
        if (
          !current ||
          current.gameId !== bound.gameId ||
          current.countryCode !== bound.country.code
        ) {
          return
        }
        const next = {
          ...current,
          ids: current.ids.filter((id) => !failedIds.has(id)),
        }
        queuedKeywordsRef.current = next
        setQueuedKeywords(next)
      }
    },
    [markKeywordsQueued, queryClient, startParseMutate],
  )

  const startParseForKeywords = useCallback(
    (nextKeywords: Keyword[]) => {
      const tracking = selectActiveTracking(useTrackingStore.getState())
      if (!tracking || nextKeywords.length === 0) {
        return
      }

      const gameId = tracking.game.id
      const bound = jobsByGameIdRef.current[gameId]
      const runningJob = bound
        ? queryClient.getQueryData<ParseJob>(['parse-job', bound.jobId])
        : undefined
      const isThisGameParsing =
        (waitingGameId === gameId &&
          (isWaitingForJobId || isStartParsePending)) ||
        runningJob?.status === 'running'
      if (isThisGameParsing) {
        return
      }

      keywordsQueuedBeforeJobIdRef.current = []
      const ids = nextKeywords.map((keyword) => keyword.id)
      const nextQueue = {
        gameId,
        countryCode: tracking.country.code,
        ids,
      }
      queuedKeywordsRef.current = nextQueue
      setQueuedKeywords(nextQueue)
      setIsWaitingForJobId(true)
      setWaitingGameId(gameId)
      setIsAppendError(false)
      setJobsByGameId((current) => {
        const next = { ...current }
        delete next[gameId]
        jobsByGameIdRef.current = next
        return next
      })
      startParseMutate(
        {
          game: tracking.game,
          country: tracking.country,
          keywords: nextKeywords,
        },
        {
          onSuccess: ({ jobId: nextJobId }) => {
            const nextBound = {
              jobId: nextJobId,
              gameId,
              country: tracking.country,
            }
            setJobsByGameId((current) => {
              const next = { ...current, [gameId]: nextBound }
              jobsByGameIdRef.current = next
              return next
            })
            const extras = keywordsQueuedBeforeJobIdRef.current
            keywordsQueuedBeforeJobIdRef.current = []
            if (extras.length > 0) {
              void enqueueOnJob(nextJobId, extras)
            }
          },
          onError: () => {
            keywordsQueuedBeforeJobIdRef.current = []
            setIsWaitingForJobId(false)
          },
        },
      )
    },
    [
      enqueueOnJob,
      isStartParsePending,
      isWaitingForJobId,
      queryClient,
      startParseMutate,
      waitingGameId,
    ],
  )

  const refreshKeyword = useCallback(
    (keywordId: string) => {
      const tracking = selectActiveTracking(useTrackingStore.getState())
      const keyword = tracking?.keywords.find((item) => item.id === keywordId)
      if (!keyword || !tracking) {
        return
      }

      const bound = jobsByGameIdRef.current[tracking.game.id]
      const currentJob = bound
        ? queryClient.getQueryData<ParseJob>(['parse-job', bound.jobId])
        : undefined
      const queued = queuedKeywordsRef.current
      const pendingIds =
        queued &&
        queued.gameId === tracking.game.id &&
        queued.countryCode === tracking.country.code
          ? queued.ids.filter((id) => !currentJob?.results[id])
          : []
      if (isKeywordParseBusy(keywordId, currentJob, pendingIds)) {
        return
      }

      const jobIdForCountry =
        bound && bound.country.code === tracking.country.code
          ? bound.jobId
          : null

      if (jobIdForCountry && currentJob?.status === 'running') {
        void enqueueOnJob(jobIdForCountry, [keyword])
        return
      }

      if (
        waitingGameId === tracking.game.id &&
        (isWaitingForJobId || isStartParsePending)
      ) {
        if (
          !keywordsQueuedBeforeJobIdRef.current.some(
            (item) => item.id === keyword.id,
          )
        ) {
          keywordsQueuedBeforeJobIdRef.current.push(keyword)
        }
        markKeywordsQueued(tracking.game.id, tracking.country.code, [keyword])
        return
      }

      startParseForKeywords([keyword])
    },
    [
      enqueueOnJob,
      isStartParsePending,
      isWaitingForJobId,
      markKeywordsQueued,
      queryClient,
      startParseForKeywords,
      waitingGameId,
    ],
  )

  return {
    job: jobForTable,
    pendingKeywordIds,
    isParsing,
    isStartParseError,
    isAppendError,
    isPollError,
    startParseForKeywords,
    refreshKeyword,
  }
}
