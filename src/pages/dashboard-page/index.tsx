import { useState } from 'react'
import { Page } from '../../components/page'
import { Modal } from '../../components/modal'
import { Button } from '../../components/button'
import { AddGameModal } from '../../components/add-game-modal'
import { useTrackingStore } from '../../store/tracking-store'
import type { Game } from '../../types'
import styles from './index.module.css'

export function DashboardPage() {
  const trackedGames = useTrackingStore((state) => state.trackedGames)
  const removeGame = useTrackingStore((state) => state.removeGame)
  const games = Object.values(trackedGames)
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null)
  const [isAddGameOpen, setIsAddGameOpen] = useState(false)

  function closeDeleteModal() {
    setGameToDelete(null)
  }

  function confirmDelete() {
    if (!gameToDelete) {
      return
    }
    removeGame(gameToDelete.id)
    closeDeleteModal()
  }

  return (
    <Page title="Dashboard">
      <section className={styles.actions} aria-label="Add game">
        <Button onClick={() => setIsAddGameOpen(true)}>+ Add game</Button>
      </section>

      {games.length === 0 ? (
        <section className={styles.empty}>
          <p>No tracked games yet.</p>
        </section>
      ) : (
        <ul className={styles.list}>
          {games.map((tracking) => (
            <li key={tracking.game.id} className={styles.card}>
              <img
                src={tracking.game.icon}
                alt=""
                className={styles.icon}
                width={48}
                height={48}
              />
              <p className={styles.name}>{tracking.game.name}</p>
              <Button
                variant="ghost"
                className={styles.deleteButton}
                onClick={() => setGameToDelete(tracking.game)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={gameToDelete !== null}
        title="Delete game"
        onClose={closeDeleteModal}
      >
        <p className={styles.description}>
          {gameToDelete
            ? `Remove ${gameToDelete.name} and all of its keywords and ranking history?`
            : ''}
        </p>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>

      <AddGameModal
        isOpen={isAddGameOpen}
        onClose={() => setIsAddGameOpen(false)}
      />
    </Page>
  )
}
