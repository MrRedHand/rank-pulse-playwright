import type { Country } from '../types'

export const COUNTRIES: Country[] = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'jp', name: 'Japan' },
  { code: 'kr', name: 'South Korea' },
  { code: 'br', name: 'Brazil' },
  { code: 'ru', name: 'Russia' },
]

export const DEFAULT_COUNTRY = COUNTRIES[0]
