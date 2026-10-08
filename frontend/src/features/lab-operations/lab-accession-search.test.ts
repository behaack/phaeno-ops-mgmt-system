import { describe, expect, it } from 'vitest'
import { parseAccessionSearch } from './lab-accession-search'

describe('accession directory URL state', () => {
  it('retains valid scope and clamps text while discarding malformed status and page values', () => {
    expect(parseAccessionSearch({ accessionView: 'samples', accessionSearch: 'x'.repeat(300), accessionStatus: 'OnHold', accessionUse: 'Used', accessionPage: '2' })).toEqual({ accessionView: 'samples', accessionSearch: 'x'.repeat(255), accessionStatus: 'OnHold', accessionUse: 'Used', accessionPage: 2 })
    for (const accessionPage of [-1, 1.5, Infinity, 2147483648]) expect(parseAccessionSearch({ accessionStatus: '__proto__', accessionPage }).accessionPage).toBeUndefined()
    expect(parseAccessionSearch({ accessionView: 'history', accessionStatus: 'LibraryPrep', accessionUse: '__proto__' })).toEqual({ accessionView: undefined, accessionSearch: undefined, accessionStatus: undefined, accessionUse: undefined, accessionPage: undefined })
    expect(parseAccessionSearch({ accessionUse: 'NotUsed' }).accessionUse).toBe('NotUsed')
  })
})
