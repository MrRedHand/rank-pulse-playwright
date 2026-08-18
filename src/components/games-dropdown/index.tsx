import { useTrackingStore } from '../../store/tracking-store'

export function GamesDropdown() {
  const trackedGames = useTrackingStore((state) => state.trackedGames)
  const activeGameId = useTrackingStore((state) => state.activeGameId)
  const selectGame = useTrackingStore((state) => state.selectGame)

  const games = Object.values(trackedGames)

  if (games.length === 0) {
    return null
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">Tracked game</span>
      <div className="relative">
        <select
          value={activeGameId ?? ''}
          onChange={(event) => selectGame(event.target.value)}
          className="appearance-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-h outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer w-3xs"
        >
          {games.map((tracking) => (
            <option key={tracking.game.id} value={tracking.game.id}>
              {tracking.game.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-h leading-2">
          &#8964;
        </span>
      </div>
    </label>
  )
}
