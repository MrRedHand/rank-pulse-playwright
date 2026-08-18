import { useState } from 'react'
import { useTrackingStore } from './store/tracking-store'
import { AddGameModal } from './components/add-game-modal'

function App() {
  const [isAddGameOpen, setIsAddGameOpen] = useState(false)
  const hasGames =
    Object.keys(useTrackingStore((state) => state.trackedGames)).length > 0

  return (
    <main className="mx-auto w-full max-w-[920px] px-6 py-12 pb-20">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-text-h">
          RankPulse
        </h1>
        <p className="mt-1 text-muted">Track app search rankings</p>
      </header>
      <section className="mb-6" aria-label="Add game">
        <button
          type="button"
          onClick={() => setIsAddGameOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          + Add game
        </button>
      </section>
      {!hasGames && (
        <section className="rounded-xl border border-border bg-surface px-4 py-4 text-muted">
          <p>Add a game by pasting a direct Google Play link.</p>
        </section>
      )}
      <AddGameModal
        isOpen={isAddGameOpen}
        onClose={() => setIsAddGameOpen(false)}
      />
    </main>
  )
}

export default App
