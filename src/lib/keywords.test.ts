import { describe, expect, it, vi } from 'vitest'
import { mergeKeywordsFromText, parseKeywordLines } from './keywords'

describe('parseKeywordLines', () => {
  it('trims lines and drops blanks and duplicates', () => {
    expect(parseKeywordLines('  puzzle  \n\nmatch 3\npuzzle\n')).toEqual([
      'puzzle',
      'match 3',
    ])
  })
})

describe('mergeKeywordsFromText', () => {
  it('keeps existing keyword ids when the value is unchanged', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-0000-0000-000000000001',
    )

    const merged = mergeKeywordsFromText('puzzle\nmatch 3', [
      { id: 'id-puzzle', value: 'puzzle' },
    ])

    expect(merged).toEqual([
      { id: 'id-puzzle', value: 'puzzle' },
      { id: '00000000-0000-0000-0000-000000000001', value: 'match 3' },
    ])

    vi.restoreAllMocks()
  })
})
