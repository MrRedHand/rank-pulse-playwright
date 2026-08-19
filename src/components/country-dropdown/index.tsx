import { COUNTRIES } from '../../lib/countries'
import { getCountryFlag } from '../../lib/countries-flags'
import {
  selectActiveTracking,
  useTrackingStore,
} from '../../store/tracking-store'
import { Select } from '../shared/select'

export function CountryDropdown() {
  const activeTracking = useTrackingStore(selectActiveTracking)
  const setCountry = useTrackingStore((state) => state.setCountry)

  if (!activeTracking) {
    return null
  }

  return (
    <Select
      label="Country"
      value={activeTracking.country.code}
      onValueChange={(code) => {
        const country = COUNTRIES.find((item) => item.code === code)
        if (country) {
          setCountry(country)
        }
      }}
      items={COUNTRIES.map((country) => ({
        value: country.code,
        label: `${getCountryFlag(country.code)} ${country.name}`,
      }))}
    />
  )
}
