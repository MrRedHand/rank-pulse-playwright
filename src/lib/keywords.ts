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

export function mergeKeywordsFromText(
  text: string,
  existingKeywords: Keyword[],
): Keyword[] {
  const byValue = new Map(
    existingKeywords.map((keyword) => [keyword.value, keyword]),
  )

  return parseKeywordLines(text).map(
    (value) => byValue.get(value) ?? { id: crypto.randomUUID(), value },
  )
}
