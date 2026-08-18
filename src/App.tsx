function App() {
  return (
    <main className="mx-auto w-full max-w-[920px] px-6 py-12 pb-20">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-text-h">
          RankPulse
        </h1>
        <p className="mt-1 text-muted">Track app search rankings</p>
      </header>

      <section className="mb-6" aria-label="Add game">
        {/* AddGameModal trigger — этап 4 */}
      </section>

      <section className="rounded-xl border border-border bg-surface px-6 py-8 text-muted">
        <p>Add a game by pasting a direct Google Play link.</p>
      </section>
    </main>
  )
}

export default App
