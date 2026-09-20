import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { api } from '#/api/client'
import { SpecimenHolds } from './SpecimenHolds'
vi.mock('#/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn() }))
const workspace = { workOrderId: 'work', specimens: [{ id: 'sample', name: 'RNA-01' }], holds: [], history: [], canRequest: true, canDecide: false }
function setup(staff = false) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <SpecimenHolds {...(staff ? { workOrderId: 'work' } : { orderId: 'order' })} />
  </QueryClientProvider>)
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.get).mockResolvedValue({ data: { data: workspace } }); vi.mocked(api.post).mockResolvedValue({}) })
it('requests a sample pause with a reason without claiming the laboratory stopped', async () => {
  setup(); fireEvent.click(await screen.findByRole('button', { name: 'Request pause' }))
  fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Please wait for our review' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/lab-service-orders/order/specimen-holds', {
    specimenId: 'sample', holdId: null, version: 0, reason: 'Please wait for our review',
  }))
  expect(screen.getByText(/Phaeno confirms when an ongoing procedure/)).toBeTruthy()
})
it('shows no request action to a member without administrative access', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { data: { ...workspace, canRequest: false } } }); setup()
  await screen.findByText('RNA-01'); expect(screen.queryByRole('button', { name: 'Request pause' })).toBeNull()
})
it('requires a safe-boundary confirmation before a staff decision', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { data: { ...workspace, canRequest: false, canDecide: true,
    holds: [{ id: 'hold', labSpecimenId: 'sample', state: 'UnableToPause', reason: 'Wait', response: null, version: 1, requestedAtUtc: '2026-09-20' }] } } })
  setup(true); fireEvent.click(await screen.findByRole('button', { name: 'Confirm safe pause' }))
  fireEvent.change(screen.getByLabelText(/Reason shared/), { target: { value: 'Safe now' } })
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  await screen.findAllByText('Confirm the safe operational boundary.'); expect(api.post).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/platform/lab-operations/work-orders/work/customer-holds/hold',
    { version: 1, action: 'apply', reason: 'Safe now', confirmed: true }))
})
