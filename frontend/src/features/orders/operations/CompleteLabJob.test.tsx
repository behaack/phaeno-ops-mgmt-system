import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { completeLabJob, type LabServiceOrder } from '#/api/order-management'
import { CompleteLabJob } from './CompleteLabJob'

vi.mock('#/api/order-management', async importOriginal => ({
  ...await importOriginal<typeof import('#/api/order-management')>(), completeLabJob: vi.fn(),
}))
const order = {
  id: 'job-1', orderNumber: 'TEST-JOB', customerReference: 'Completion test', version: 8,
  status: 'InProgress', samples: [{ id: 'sample-1', status: 'Completed' }],
} as LabServiceOrder

function setup(overrides: Partial<LabServiceOrder> = {}, authorized = true) {
  const onSaved = vi.fn().mockResolvedValue(undefined)
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CompleteLabJob order={{ ...order, ...overrides }} authorized={authorized} onSaved={onSaved} /></QueryClientProvider>)
  return { onSaved }
}

describe('Job completion', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each([false, true])('does not offer completion outside its authority or active state (%s)', authorized => {
    setup(authorized ? { status: 'Completed' } : {}, authorized)
    expect(screen.queryByRole('button', { name: 'Complete Job' })).toBeNull()
  })

  it.each([{ samples: [] }, { samples: [{ id: 'sample-1', status: 'Accessioned' }] }, { samples: [{ id: 'sample-1', status: 'OnHold' }] }])('blocks empty or unfinished samples', ({ samples }) => {
    setup({ samples: samples as LabServiceOrder['samples'] })
    fireEvent.click(screen.getByRole('button', { name: 'Complete Job' }))
    expect(screen.getByRole('button', { name: 'Confirm completion' })).toHaveProperty('disabled', true)
    expect(completeLabJob).not.toHaveBeenCalled()
  })

  it.each(['Completed', 'Rejected', 'Failed', 'Cancelled'])('allows a recorded final %s outcome and explains failed billing', status => {
    setup({ samples: [{ id: 'sample-1', status }] as LabServiceOrder['samples'] })
    fireEvent.click(screen.getByRole('button', { name: 'Complete Job' }))
    expect(screen.getByRole('button', { name: 'Confirm completion' })).toHaveProperty('disabled', false)
    expect(screen.getByText(/Failed processing remains billable/)).toBeTruthy()
  })

  it('requires confirmation and preserves the operation key and reviewed version after an uncertain response and reopening', async () => {
    vi.mocked(completeLabJob).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ ...order, status: 'Completed' })
    const { onSaved } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Complete Job' }))
    expect(completeLabJob).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm completion' }))
    await screen.findByRole('alert')
    const first = vi.mocked(completeLabJob).mock.calls[0]
    expect(first).toEqual(['job-1', 8, expect.any(String)])
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete Job' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm completion' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(vi.mocked(completeLabJob).mock.calls[1]).toEqual(first)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('requires deliberate reload and renewed review after a stale-version conflict', async () => {
    vi.mocked(completeLabJob).mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { error: { code: 'concurrency_conflict', message: 'Changed Job' } } } })
    const { onSaved } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Complete Job' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm completion' }))
    const reload = await screen.findByRole('button', { name: 'Reload Job' })
    expect(screen.queryByRole('button', { name: 'Confirm completion' })).toBeNull()
    expect(onSaved).not.toHaveBeenCalled()
    fireEvent.click(reload)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(completeLabJob).toHaveBeenCalledTimes(1)
  })

  it('blocks duplicate clicks and dismissal while completion is pending', async () => {
    let resolve!: (value: LabServiceOrder) => void
    vi.mocked(completeLabJob).mockImplementation(() => new Promise(value => { resolve = value }))
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Complete Job' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm completion' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Completing…' })).toHaveProperty('disabled', true))
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
    resolve({ ...order, status: 'Completed' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
