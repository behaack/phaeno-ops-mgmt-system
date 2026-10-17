import { describe, expect, it } from 'vitest'
import { parseResearchSearch } from './research-search'

describe('research list navigation', () => {
  it('keeps each list selection independent and rejects malformed URL filters', () => {
    const state = parseResearchSearch({ projectPage: '3', experimentPage: '7', projectSearch: 'enzyme', experimentSearch: 'yield', status: 'Completed', projectId: '11111111-1111-1111-1111-111111111111' })
    expect(state).toEqual({ projectPage: 3, experimentPage: 7, projectSearch: 'enzyme', experimentSearch: 'yield', status: 'Completed', projectId: '11111111-1111-1111-1111-111111111111' })
    expect(parseResearchSearch({ projectPage: -1, experimentPage: '1.2', projectId: ['other'], status: 'Approved' })).toMatchObject({ projectPage: 1, experimentPage: 1, projectId: '', status: '' })
    expect(parseResearchSearch({ fromProjectId: '11111111-1111-1111-1111-111111111111' }).fromProjectId).toBe('11111111-1111-1111-1111-111111111111')
    expect(parseResearchSearch({ entryPage: '4', experimentPage: 7 })).toMatchObject({ entryPage: 4, experimentPage: 7 })
    expect(parseResearchSearch({ entryPage: -1 }).entryPage).toBe(1)
  })
})
