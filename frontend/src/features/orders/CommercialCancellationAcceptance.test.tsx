import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useState } from 'react'
import { runPlatformAction, type LabServiceOrder } from '#/api/order-management'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '#/features/auth/session-context'
import { bundleLabDraft } from '#/test-helpers/bundled-orders'
import { CommercialControlPanel } from './OrderOperationsPage'

vi.mock('#/api/order-management', async importOriginal => ({ ...await importOriginal<typeof import('#/api/order-management')>(), runPlatformAction: vi.fn() }))

it('saves an explicit cancellation through the owning Commercial panel and preserves the Lab return destination', async () => {
  const pending = { ...structuredClone(bundleLabDraft), status: 'CancellationRequested', canManageQuotes: false,
    quotes: [], samples: [{ id: 'unreceived', customerSampleId: 'SAMPLE-A', status: 'Expected' }, { id: 'received', customerSampleId: 'SAMPLE-B', status: 'Received' }],
    cancellationRequests: [{ id: 'cancel-1', status: 'Pending', createdAt: '2026-09-15T12:00:00Z', reason: 'Cancel only SAMPLE-A.' }],
  } as unknown as LabServiceOrder
  function Workspace() {
    const [item, setItem] = useState(pending)
    return <CommercialControlPanel workflow="lab" item={item} catalogItems={[]} labWorkOrderId="work-123" onSaved={async () => {
      setItem({ ...item, status: 'InProgress', version: item.version + 1,
        samples: item.samples.map(sample => sample.id === 'unreceived' ? { ...sample, status: 'Cancelled' } : sample),
        cancellationRequests: item.cancellationRequests.map(request => ({ ...request, status: 'PartiallyApproved', decisionReason: 'Cancel only SAMPLE-A.' })),
      })
    }} />
  }
  const root = createRootRoute({ component: Workspace })
  const index = createRoute({ getParentRoute: () => root, path: '/' })
  const lab = createRoute({ getParentRoute: () => root, path: '/lab-operations/$workOrderId' })
  const router = createRouter({ routeTree: root.addChildren([index, lab]), history: createMemoryHistory({ initialEntries: ['/'] }) })
  const session = { session: { capabilities: { canManageOrderConfiguration: true } } } as PhaenoSessionContextValue
  vi.mocked(runPlatformAction).mockResolvedValue({})
  render(<PhaenoSessionContext.Provider value={session}><QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider></PhaenoSessionContext.Provider>)
  fireEvent.click(await screen.findByRole('button', { name: 'Decide request' }))
  fireEvent.change(screen.getByLabelText('Decision *'), { target: { value: 'PartiallyApproved' } })
  fireEvent.click(screen.getByRole('checkbox', { name: /SAMPLE-A/ }))
  fireEvent.change(screen.getByLabelText(/Reason for the Customer/), { target: { value: 'Cancel only SAMPLE-A.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save decision' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByText('Partially Approved')).toBeTruthy()
  expect(screen.getByText('Decision: Cancel only SAMPLE-A.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Open Lab work' }).getAttribute('href')).toContain('/lab-operations/work-123')
  expect(runPlatformAction).toHaveBeenCalledWith(`lab-service-orders/${pending.id}/cancellation-requests/cancel-1/decision`, expect.objectContaining({ sampleIds: ['unreceived'], status: 'PartiallyApproved', version: pending.version }))
})
