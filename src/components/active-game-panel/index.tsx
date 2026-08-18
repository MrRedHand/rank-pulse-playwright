import {
  selectActiveTracking,
  useTrackingStore,
} from '../../store/tracking-store'
import { CountryDropdown } from '../country-dropdown'
import { GamesDropdown } from '../games-dropdown'

export function ActiveGamePanel() {
  const activeTracking = useTrackingStore(selectActiveTracking)

  if (!activeTracking) {
    return null
  }

  const { game, keywords } = activeTracking

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <GamesDropdown />
        <CountryDropdown />
      </div>

      <article className="rounded-xl border border-border bg-surface p-5">
        <div className="flex gap-4">
          <img
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

      {keywords.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-8 text-center text-muted">
          <p>Add keywords to start tracking search rankings.</p>
        </div>
      )}
    </section>
  )
}
