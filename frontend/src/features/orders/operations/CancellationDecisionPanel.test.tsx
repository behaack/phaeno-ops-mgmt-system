import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runPlatformAction, type CancellationRequest } from '#/api/order-management'
import { CancellationDecisionPanel } from './CancellationDecisionPanel'

vi.mock('#/api/order-management', async importOriginal => ({ ...await importOriginal<typeof import('#/api/order-management')>(), runPlatformAction: vi.fn() }))
const requests = [{ id: 'request-1', status: 'Pending', reason: 'Cancel unreceived samples', createdAt: '2026-09-15T00:00:00Z' }] as CancellationRequest[]
function setup() {
  const onSaved = vi.fn().mockResolvedValue(undefined)
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><CancellationDecisionPanel
    workflowPath="lab-service-orders" recordId="job-1" version={9} requests={requests} onSaved={onSaved}
    labSamples={[{ id: 'sample-1', customerSampleId: 'Awaiting sample', status: 'Expected' }, { id: 'sample-2', customerSampleId: 'Received sample', status: 'Received' }]} />
  </QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Decide request' }))
  fireEvent.change(screen.getByLabelText(/Decision/), { target: { value: 'PartiallyApproved' } })
  fireEvent.change(screen.getByLabelText(/Reason for the Customer/), { target: { value: 'Cancel only the unreceived sample.' } })
  return { onSaved }
}
describe('Lab partial cancellation', () => {
  beforeEach(() => vi.resetAllMocks())
  it('requires an explicit selection and protects received samples', async () => {
    vi.mocked(runPlatformAction).mockResolvedValue(undefined)
    const { onSaved } = setup()
    expect(screen.getByRole('checkbox', { name: /Received sample/ })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Save decision' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('checkbox', { name: /Awaiting sample/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(runPlatformAction).toHaveBeenCalledWith('lab-service-orders/job-1/cancellation-requests/request-1/decision', {
      version: 9, status: 'PartiallyApproved', reason: 'Cancel only the unreceived sample.', sampleIds: ['sample-1'], lines: undefined,
    })
  })
  it('preserves reviewed choices when saving fails and protects dismissal', async () => {
    vi.mocked(runPlatformAction).mockRejectedValue(new Error('Lab receipt changed. Reload and review.'))
    setup(); fireEvent.click(screen.getByRole('checkbox', { name: /Awaiting sample/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }))
    await screen.findByText('Decision was not saved')
    expect(screen.getByRole('checkbox', { name: /Awaiting sample/ })).toHaveProperty('checked', true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await screen.findByText('Discard your unsaved cancellation decision?')
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText(/Reason for the Customer/)).toHaveProperty('value', 'Cancel only the unreceived sample.')
  })
  it('blocks duplicate submission and dismissal while saving', async () => {
    let resolve!: (value: unknown) => void
    vi.mocked(runPlatformAction).mockImplementation(() => new Promise(done => { resolve = done }))
    setup(); fireEvent.click(screen.getByRole('checkbox', { name: /Awaiting sample/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }))
    await screen.findByRole('button', { name: 'Saving…' })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByText('Discard your unsaved cancellation decision?')).toBeNull()
    expect(runPlatformAction).toHaveBeenCalledOnce()
    resolve(undefined); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
