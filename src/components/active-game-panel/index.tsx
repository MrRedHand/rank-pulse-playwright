import { useState } from 'react'
import {
  selectActiveTracking,
  useTrackingStore,
} from '../../store/tracking-store'
import { CountryDropdown } from '../country-dropdown'
import { GamesDropdown } from '../games-dropdown'
import { KeywordsModal } from '../keywords-modal'
import { mergeKeywordsFromText } from '../../lib/keywords'
import { RankTable } from '../rank-table'
import { Button } from '../shared/button'
import { useParseOrchestration } from '../../hooks/use-parse-orchestration'
import {
  lastParsedAtForCountry,
  snapshotsForCountry,
} from '../../lib/snapshots'
import styles from './index.module.css'

export function ActiveGamePanel() {
  const activeTracking = useTrackingStore(selectActiveTracking)
  const setKeywords = useTrackingStore((state) => state.setKeywords)
  const {
    job,
    pendingKeywordIds,
    isParsing,
    isStartParseError,
    isAppendError,
    isPollError,
    startParseForKeywords,
    refreshKeyword,
  } = useParseOrchestration()

  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false)
  const [keywordDraft, setKeywordDraft] = useState('')

  if (!activeTracking) {
    return null
  }

  const { game, keywords, country } = activeTracking
  const history = snapshotsForCountry(
    activeTracking.historyByCountry,
    country.code,
  )
  const lastParsedAt = lastParsedAtForCountry(
    activeTracking.lastParsedAtByCountry,
    country.code,
  )

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

  return (
    <section className={styles.panel}>
      <div className={styles.filters}>
        <GamesDropdown />
        <CountryDropdown />
      </div>

      <article className={styles.card}>
        <div className={styles.cardBody}>
          <img
            key={`${game.id}-${game.icon}`}
            src={game.icon}
            alt=""
            className={styles.icon}
            width={64}
            height={64}
          />
          <div className={styles.details}>
            <h2 className={styles.name}>{game.name}</h2>
            {game.shortDescription && (
              <p className={styles.description}>{game.shortDescription}</p>
            )}
            <a
              href={game.link}
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              {game.link}
            </a>
          </div>
        </div>
      </article>

      <div className={styles.toolbar}>
        <Button variant="outline" onClick={openKeywordModal}>
          + Add keywords
        </Button>

        <Button
          onClick={() => startParseForKeywords(keywords)}
          disabled={keywords.length === 0 || isParsing}
        >
          {isParsing ? 'Parsing…' : '▶ Parse'}
        </Button>
      </div>

      {isStartParseError && (
        <p className={styles.error}>Failed to start parse.</p>
      )}
      {isAppendError && (
        <p className={styles.error}>Failed to add keywords to parse.</p>
      )}
      {isPollError && (
        <p className={styles.error}>Failed to load parse progress.</p>
      )}

      {keywords.length === 0 ? (
        <div className={styles.empty}>
          <p>Add keywords to start tracking search rankings.</p>
        </div>
      ) : (
        <RankTable
          keywords={keywords}
          history={history}
          lastParsedAt={lastParsedAt}
          job={job}
          pendingKeywordIds={pendingKeywordIds}
          onRefreshKeyword={refreshKeyword}
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
