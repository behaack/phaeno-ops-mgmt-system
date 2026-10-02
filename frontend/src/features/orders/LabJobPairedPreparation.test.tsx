import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder } from '#/api/order-management'
import { LabJobPairedPreparation } from './LabJobPairedPreparation'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('#/api/order-management', async original => ({ ...await original<typeof import('#/api/order-management')>(), getLabSampleTubePairs: mocks.get }))

describe('Preparation after phase cancellation', () => {
  it('counts only required pairs and enables finalization with the active source scope', async () => {
    const scope = { sources: [{ biologicalSource: 'Human', specimenCount: 1 }], runsPerSample: 1, sequencingRunCount: 1 }
    const order = { id: 'order', version: 3, requestedSpecimenCount: 2, requestedSequencingRunCount: 4,
      sourceGroups: [{ biologicalSource: 'Human', specimenCount: 2 }], canFinalizeSamples: true, canEditSamples: true,
      phaseScopes: [{ id: 'active', name: 'Phase 1', sampleCount: 1, scope }, { id: 'cancelled', name: 'Phase 2', sampleCount: 1, scope: { ...scope, runsPerSample: 3, sequencingRunCount: 3 } }] } as LabServiceOrder
    mocks.get.mockResolvedValue({ expectedSampleCount: 1, expectedSequencingRunCount: 1, preparationSources: scope.sources,
      preparationPhaseIds: ['active'], isFinalized: false, minimumSampleAmount: 1, sampleAmountUnit: 'µL', kits: [],
      pairs: [{ id: 'a', phaseId: 'active', biologicalSource: 'Human', sequencingRunCount: 1 }, { id: 'b', phaseId: 'cancelled', biologicalSource: 'Human', sequencingRunCount: 3 }] })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LabJobPairedPreparation order={order} /></QueryClientProvider>)
    expect(await screen.findByText('1 of 1 Sample ID/tube pairs saved')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Confirm phase pairs' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByLabelText('Sequencing runs')).toBeNull()
    expect(screen.getByText(/Preparing Phase 1/)).toBeTruthy()
  })
})
