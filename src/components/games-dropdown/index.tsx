import { useTrackingStore } from '../../store/tracking-store'
import { Select } from '../select'

export function GamesDropdown() {
  const trackedGames = useTrackingStore((state) => state.trackedGames)
  const activeGameId = useTrackingStore((state) => state.activeGameId)
  const selectGame = useTrackingStore((state) => state.selectGame)

  const games = Object.values(trackedGames)

  if (games.length === 0 || !activeGameId) {
    return null
  }

  return (
    <Select
      label="Tracked game"
      value={activeGameId}
      onValueChange={selectGame}
      items={games.map((tracking) => ({
        value: tracking.game.id,
        label: tracking.game.name,
      }))}
    />
  )
}
