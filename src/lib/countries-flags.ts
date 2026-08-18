export const COUNTRY_FLAGS: Record<string, string> = {
  us: '🇺🇸',
  gb: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  jp: '🇯🇵',
  kr: '🇰🇷',
  br: '🇧🇷',
  ru: '🇷🇺',
}

export function getCountryFlag(code: string): string {
  return COUNTRY_FLAGS[code] ?? '🌐'
}
