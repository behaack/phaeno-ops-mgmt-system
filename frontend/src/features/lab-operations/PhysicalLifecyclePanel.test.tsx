import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import type { LabContainer } from '#/api/lab-operations'
import { getPhysicalState, type PhysicalState } from '#/api/lab-physical'
import { PhysicalLifecyclePanel } from './PhysicalLifecyclePanel'

vi.mock('#/api/lab-physical', () => ({ getPhysicalState: vi.fn(), recordPhysicalEvent: vi.fn(), findStorageBoxes: vi.fn(), saveStorageBox: vi.fn() }))
const tube = { id: 'test-tube', barcode: 'TEST-TUBE', location: null, quantityUnit: 'uL', version: 1 } as LabContainer
function mount(location: PhysicalState['history']['locations'][number]['location']) {
  vi.mocked(getPhysicalState).mockResolvedValue({ box: null, storagePosition: null, physicalHoldReason: null, retainUntilUtc: null, trialHold: false, trialTerms: null,
    history: { events: [], boxMoves: [], limited: false, locations: [{ physicalEventId: 'test-placement', labContainerId: tube.id, storageBoxId: 'test-box', occurredAtUtc: '2026-10-24T10:00:00Z', sourceMoveId: null, locationRecordedAtUtc: null, location,
      availability: location ? 'Recorded location as of placement; earlier registration/movement is context only.' : 'Unknown: no registered location was recorded at this placement time.' }] } })
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PhysicalLifecyclePanel tube={tube} action={null} supervise={false} onClose={() => {}} onSaved={async () => {}} /></QueryClientProvider>)
}
it('keeps a departed tube’s registered location visible without inventing a current box', async () => {
  mount({ room: 'Original room', freezer: 'Original freezer', rack: 'Original rack', shelf: 'Original shelf' })
  expect(await screen.findByText('Original room / Original freezer / Original rack / Original shelf')).toBeDefined()
  expect(screen.getByText('No current laboratory storage')).toBeDefined()
  expect(screen.getByText(/earlier registration\/movement is context only/)).toBeDefined()
})
it('shows unknown location history explicitly', async () => {
  mount(null)
  expect(await screen.findByText(/Unknown: no registered location/)).toBeDefined()
  expect(screen.queryByText('Original shelf')).toBeNull()
})
