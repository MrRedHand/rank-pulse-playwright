import { useState } from 'react'
import { useTrackingStore } from '../../store/tracking-store'
import { useFetchGame } from '../../hooks/use-fetch-games'
import {
  isValidPlayStoreLink,
  normalizePlayStoreLink,
  PLAY_STORE_LINK_ERROR,
} from '../../lib/play-store-link-validator'
import type { Game } from '../../types'
import { Modal } from '../modal'
import { Button } from '../button'
import { Input } from '../input'
import styles from './index.module.css'

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
  const activeGameId = useTrackingStore((state) => state.activeGameId)

  const { mutate, isPending, isError, reset } = useFetchGame()

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

  function getPreviewActionLabel(): string {
    if (!parsedGame) {
      return 'Add'
    }
    if (!trackedGames[parsedGame.id]) {
      return 'Add'
    }
    if (activeGameId === parsedGame.id) {
      return 'Update'
    }
    return 'Switch'
  }

  return (
    <Modal isOpen={isOpen} title="Add game" onClose={handleClose}>
      <p className={styles.description}>
        Paste a direct Google Play link to fetch game details.
      </p>
      <p className={styles.example}>
        Example:
        https://play.google.com/store/apps/details?id=com.king.candycrushsaga
      </p>
      <label className={styles.label} htmlFor="game-link">
        Game link
      </label>
      <Input
        id="game-link"
        type="url"
        value={linkDraft}
        onValueChange={handleLinkChange}
        placeholder="https://play.google.com/store/apps/details?id=package.name"
        className={styles.field}
        disabled={isPending}
      />
      {validationError && <p className={styles.error}>{validationError}</p>}
      {isError && !validationError && (
        <p className={styles.error}>
          Failed to fetch game. Check the link and try again.
        </p>
      )}
      {parsedGame && (
        <div className={styles.preview}>
          <p className={styles.previewLabel}>Game found</p>
          <div className={styles.previewRow}>
            <img
              key={`${parsedGame.id}`}
              src={parsedGame.icon}
              alt=""
              className={styles.icon}
              width={48}
              height={48}
            />
            <p className={styles.name}>{parsedGame.name}</p>
            <Button className={styles.addButton} onClick={handleAddParsed}>
              {getPreviewActionLabel()}
            </Button>
          </div>
        </div>
      )}
      <div className={styles.footer}>
        <Button variant="ghost" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleFetch} disabled={isPending}>
          {isPending ? 'Fetching…' : parsedGame ? 'Fetch again' : 'Find game'}
        </Button>
      </div>
    </Modal>
  )
}
