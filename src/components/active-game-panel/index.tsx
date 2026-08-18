import { useState } from 'react'
import {
  selectActiveTracking,
  useTrackingStore,
} from '../../store/tracking-store'
import { CountryDropdown } from '../country-dropdown'
import { GamesDropdown } from '../games-dropdown'
import { KeywordsModal } from '../keywords-modal'
import { createKeywordsFromText } from '../../lib/keywords'

export function ActiveGamePanel() {
  const activeTracking = useTrackingStore(selectActiveTracking)
  const setKeywords = useTrackingStore((state) => state.setKeywords)

  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false)
  const [keywordDraft, setKeywordDraft] = useState('')

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
    setKeywords(createKeywordsFromText(keywordDraft))
    closeKeywordModal()
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
      </div>

      {keywords.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-8 text-center text-muted">
          <p>Add keywords to start tracking search rankings.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/60">
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Keyword
                </th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((keyword) => (
                <tr
                  key={keyword.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3 text-text-h">{keyword.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
