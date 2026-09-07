import { describe, expect, it, vi } from 'vitest'
import { ResumableDraft } from './resumable-draft'

describe('ResumableDraft', () => {
  it('recovers an uncertain creation with the original key and input before continuing the draft', async () => {
    const session = new ResumableDraft<{ reference: string }, { id: string }>()
    const create = vi.fn().mockRejectedValueOnce(new Error('Response lost')).mockResolvedValue({ id: 'saved-draft' })
    const original = { reference: 'Original request' }
    await expect(session.getOrCreate(original, create)).rejects.toThrow('Response lost')
    original.reference = 'Changed after the failed response'
    await expect(session.getOrCreate(original, create)).resolves.toEqual({ id: 'saved-draft' })
    expect(create.mock.calls[1]).toEqual(create.mock.calls[0])
    expect(create.mock.calls[1][0]).toEqual({ reference: 'Original request' })
    expect(create.mock.calls[1][1]).toBeTruthy()
  })

  it('uses the saved record for a later retry rather than creating another draft', async () => {
    const session = new ResumableDraft<string, { id: string }>()
    const create = vi.fn().mockResolvedValue({ id: 'saved-draft' })
    await session.getOrCreate('scope', create)
    await session.getOrCreate('revised scope', create)
    expect(create).toHaveBeenCalledTimes(1)
  })
})
