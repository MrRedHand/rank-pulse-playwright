import type { Keyword } from '../types'

export function parseKeywordLines(text: string): string[] {
  const seen = new Set<string>()
  const values: string[] = []

  for (const line of text.split('\n')) {
    const value = line.trim()
    if (!value || seen.has(value)) {
      continue
    }
    seen.add(value)
    values.push(value)
  }

  return values
}

export function createKeywordsFromText(text: string): Keyword[] {
  return parseKeywordLines(text).map((value) => ({
    id: crypto.randomUUID(),
    value,
  }))
}
