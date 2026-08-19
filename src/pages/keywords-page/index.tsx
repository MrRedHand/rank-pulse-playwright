import { useState } from 'react'
import { AddGameModal } from '../../components/add-game-modal'
import { ActiveGamePanel } from '../../components/active-game-panel'
import { Page } from '../../components/shared/page'
import { Button } from '../../components/shared/button'
import { useTrackingStore } from '../../store/tracking-store'
import styles from './index.module.css'

export function KeywordsPage() {
  const [isAddGameOpen, setIsAddGameOpen] = useState(false)
  const hasGames =
    Object.keys(useTrackingStore((state) => state.trackedGames)).length > 0

  return (
    <Page title="Keywords">
      <section className={styles.actions} aria-label="Add game">
        <Button onClick={() => setIsAddGameOpen(true)}>+ Add game</Button>
      </section>

      {hasGames ? (
        <ActiveGamePanel />
      ) : (
        <section className={styles.empty}>
          <p>Add a game by pasting a direct Google Play link.</p>
        </section>
      )}

      <AddGameModal
        isOpen={isAddGameOpen}
        onClose={() => setIsAddGameOpen(false)}
      />
    </Page>
  )
}
