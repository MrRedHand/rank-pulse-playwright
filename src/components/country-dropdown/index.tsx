import { COUNTRIES } from '../../lib/countries'
import { getCountryFlag } from '../../lib/countries-flags'
import {
  selectActiveTracking,
  useTrackingStore,
} from '../../store/tracking-store'

export function CountryDropdown() {
  const activeTracking = useTrackingStore(selectActiveTracking)
  const setCountry = useTrackingStore((state) => state.setCountry)

  if (!activeTracking) {
    return null
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">Country</span>
      <div className="relative">
        <select
          value={activeTracking.country.code}
          onChange={(event) => {
            const country = COUNTRIES.find(
              (item) => item.code === event.target.value,
            )
            if (country) {
              setCountry(country)
            }
          }}
          className="appearance-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-h outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer w-3xs"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {getCountryFlag(country.code)} {country.name}
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
