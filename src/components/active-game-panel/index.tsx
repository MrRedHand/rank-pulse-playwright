import { useCallback, useEffect, useRef, useState } from 'react'
import {
  selectActiveTracking,
  useTrackingStore,
} from '../../store/tracking-store'
import { CountryDropdown } from '../country-dropdown'
import { GamesDropdown } from '../games-dropdown'
import { KeywordsModal } from '../keywords-modal'
import { mergeKeywordsFromText } from '../../lib/keywords'
import { RankTable } from '../rank-table'
import { useStartParse } from '../../hooks/use-start-parse'
import { useParseJob } from '../../hooks/use-parse-job'
import { snapshotFromJob } from '../../lib/snapshots'
import { getLocalDateString } from '../../lib/dates'
import type { Keyword } from '../../types'

export function ActiveGamePanel() {
  const activeTracking = useTrackingStore(selectActiveTracking)
  const setKeywords = useTrackingStore((state) => state.setKeywords)
  const addSnapshot = useTrackingStore((state) => state.addSnapshot)

  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false)
  const [keywordDraft, setKeywordDraft] = useState('')
  const [activeJob, setActiveJob] = useState<{
    jobId: string
    gameId: string
  } | null>(null)
  const [awaitingJob, setAwaitingJob] = useState(false)
  const persistedJobIdRef = useRef<string | null>(null)
  const isParsingRef = useRef(false)

  const {
    mutate: startParseMutate,
    isPending: isStartParsePending,
    isError: isStartParseError,
  } = useStartParse()
  const jobId =
    activeTracking && activeJob?.gameId === activeTracking.game.id
      ? activeJob.jobId
      : null
  const { data: job, isError: isJobQueryError } = useParseJob(jobId)

  if (awaitingJob && jobId && job?.id === jobId) {
    setAwaitingJob(false)
  } else if (awaitingJob && isJobQueryError) {
    setAwaitingJob(false)
  }

  useEffect(() => {
    if (!job || (job.status !== 'done' && job.status !== 'error')) {
      return
    }

    if (persistedJobIdRef.current === job.id) {
      return
    }

    persistedJobIdRef.current = job.id
    const today = getLocalDateString()
    const tracking = selectActiveTracking(useTrackingStore.getState())
    const base = tracking?.history.find((snapshot) => snapshot.date === today)
    addSnapshot(snapshotFromJob(job, today, base), new Date().toISOString())
  }, [job, addSnapshot])

  const isParsing =
    awaitingJob || isStartParsePending || job?.status === 'running'

  useEffect(() => {
    isParsingRef.current = isParsing
  }, [isParsing])

  const launchParse = useCallback(
    (nextKeywords: Keyword[]) => {
      const tracking = selectActiveTracking(useTrackingStore.getState())
      if (!tracking || nextKeywords.length === 0 || isParsingRef.current) {
        return
      }

      setAwaitingJob(true)
      setActiveJob(null)
      startParseMutate(
        {
          game: tracking.game,
          country: tracking.country,
          keywords: nextKeywords,
        },
        {
          onSuccess: ({ jobId: nextJobId }) => {
            setActiveJob({ jobId: nextJobId, gameId: tracking.game.id })
          },
          onError: () => {
            setAwaitingJob(false)
          },
        },
      )
    },
    [startParseMutate],
  )

  const handleRefreshKeyword = useCallback(
    (keywordId: string) => {
      const tracking = selectActiveTracking(useTrackingStore.getState())
      const keyword = tracking?.keywords.find((item) => item.id === keywordId)
      if (!keyword) {
        return
      }
      launchParse([keyword])
    },
    [launchParse],
  )

  if (!activeTracking) {
    return null
  }

  const { game, keywords } = activeTracking

  function openKeywordModal() {
    setKeywordDraft(keywords.map((keyword) => keyword.value).join('\n'))
    setIsKeywordModalOpen(true)
  }

  function closeKeywordModal() {
    setIsKeywordModalOpen(false)
    setKeywordDraft('')
  }

  function handleSaveKeywords() {
    setKeywords(mergeKeywordsFromText(keywordDraft, keywords))
    closeKeywordModal()
  }

  function handleParse() {
    launchParse(keywords)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <GamesDropdown />
        <CountryDropdown />
      </div>

      <article className="rounded-xl border border-border bg-surface p-5">
        <div className="flex gap-4">
          <img
            key={`${game.id}-${game.icon}`}
            src={game.icon}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl bg-bg object-cover"
            width={64}
            height={64}
          />
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-text-h">{game.name}</h2>
            {game.shortDescription && (
              <p className="mt-1 text-sm text-muted">{game.shortDescription}</p>
            )}
            <a
              href={game.link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block truncate text-sm text-accent hover:text-accent-hover"
            >
              {game.link}
            </a>
          </div>
        </div>
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={openKeywordModal}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-h hover:bg-bg"
        >
          + Add keywords
        </button>

        <button
          type="button"
          onClick={handleParse}
          disabled={keywords.length === 0 || isParsing}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {isParsing ? 'Parsing…' : '▶ Parse'}
        </button>
      </div>

      {isStartParseError && (
        <p className="text-sm text-danger">Failed to start parse.</p>
      )}

      {keywords.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-8 text-center text-muted">
          <p>Add keywords to start tracking search rankings.</p>
        </div>
      ) : (
        <RankTable
          keywords={keywords}
          history={activeTracking.history}
          lastParsedAt={activeTracking.lastParsedAt}
          job={job}
          refreshDisabled={isParsing}
          onRefreshKeyword={handleRefreshKeyword}
        />
      )}

      <KeywordsModal
        isOpen={isKeywordModalOpen}
        draft={keywordDraft}
        onDraftChange={setKeywordDraft}
        onClose={closeKeywordModal}
        onSave={handleSaveKeywords}
      />
    </section>
  )
}
