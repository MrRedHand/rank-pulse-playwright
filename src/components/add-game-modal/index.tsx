import { useState } from 'react'
import { useTrackingStore } from '../../store/tracking-store'
import { useFetchGame } from '../../hooks/use-fetch-games'
import {
  isValidPlayStoreLink,
  normalizePlayStoreLink,
  PLAY_STORE_LINK_ERROR,
} from '../../lib/play-store-link-validator'
import type { Game } from '../../types'

type AddGameModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function AddGameModal({ isOpen, onClose }: AddGameModalProps) {
  const [linkDraft, setLinkDraft] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [parsedGame, setParsedGame] = useState<Game | null>(null)

  const addGame = useTrackingStore((state) => state.addGame)
  const trackedGames = useTrackingStore((state) => state.trackedGames)

  const { mutate, isPending, isError, reset } = useFetchGame()

  if (!isOpen) {
    return null
  }

  function resetModalState() {
    setLinkDraft('')
    setValidationError(null)
    setParsedGame(null)
    reset()
  }

  function handleClose() {
    resetModalState()
    onClose()
  }

  function handleLinkChange(value: string) {
    setLinkDraft(value)
    setValidationError(null)
    setParsedGame(null)
    reset()
  }

  function handleFetch() {
    const link = normalizePlayStoreLink(linkDraft)
    if (!isValidPlayStoreLink(link)) {
      setValidationError(PLAY_STORE_LINK_ERROR)
      setParsedGame(null)
      return
    }
    setValidationError(null)
    mutate(link, {
      onSuccess: (game) => {
        setParsedGame(game)
      },
    })
  }

  function handleAddParsed() {
    if (!parsedGame) {
      return
    }
    addGame(parsedGame)
    handleClose()
  }

  const isAlreadyTracked = parsedGame
    ? Boolean(trackedGames[parsedGame.id])
    : false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-game-title"
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2 id="add-game-title" className="text-lg font-semibold text-text-h">
          Add game
        </h2>
        <p className="mt-1 text-sm text-muted">
          Paste a direct Google Play link to fetch game details.
        </p>
        <label className="mt-4 block text-sm text-muted" htmlFor="game-link">
          Game link
        </label>
        <input
          id="game-link"
          type="url"
          value={linkDraft}
          onChange={(event) => handleLinkChange(event.target.value)}
          placeholder="https://play.google.com/store/apps/details?id=package.name"
          className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-text-h outline-none focus-visible:ring-2 focus-visible:ring-accent"
          disabled={isPending}
        />
        {validationError && (
          <p className="mt-2 text-sm text-danger">{validationError}</p>
        )}
        {isError && !validationError && (
          <p className="mt-2 text-sm text-danger">
            Failed to fetch game. Check the link and try again.
          </p>
        )}
        {parsedGame && (
          <div className="mt-4 rounded-lg border border-border bg-bg p-3">
            <p className="mb-2 text-xs text-muted">Game found</p>
            <div className="flex items-center gap-3">
              <img
                src={parsedGame.icon}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
                width={48}
                height={48}
              />
              <p className="min-w-0 flex-1 truncate font-medium text-text-h">
                {parsedGame.name}
              </p>
              <button
                type="button"
                onClick={handleAddParsed}
                className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                {isAlreadyTracked ? 'Switch' : 'Add'}
              </button>
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm text-muted hover:text-text-h disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFetch}
            disabled={isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {isPending ? 'Fetching…' : parsedGame ? 'Fetch again' : 'Find game'}
          </button>
        </div>
      </div>
    </div>
  )
}
