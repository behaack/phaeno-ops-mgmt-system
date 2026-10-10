import { describe, expect, it } from 'vitest'
import { assemblyAttemptFromDispatchError } from './lab-assembly'

describe('saved assembly recovery from dispatch errors', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const error = (code: string, assemblyJobId: unknown) => ({ isAxiosError: true, response: { data: { error: { code, details: { assemblyJobId } } } } })

  it('offers the saved identity for failed or unconfirmed dispatch', () => {
    expect(assemblyAttemptFromDispatchError(error('assembly_dispatch_failed', id))).toBe(id)
    expect(assemblyAttemptFromDispatchError(error('assembly_dispatch_unconfirmed', id))).toBe(id)
  })

  it('does not invent a saved attempt from a setup error or arbitrary locator', () => {
    expect(assemblyAttemptFromDispatchError(error('dps_dispatch_unavailable', id))).toBeNull()
    expect(assemblyAttemptFromDispatchError(error('assembly_dispatch_failed', 'https://example.invalid'))).toBeNull()
    expect(assemblyAttemptFromDispatchError(new Error('offline'))).toBeNull()
  })
})
