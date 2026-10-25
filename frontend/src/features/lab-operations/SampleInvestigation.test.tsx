import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { SampleInvestigation } from './SampleInvestigation'

const mocks = vi.hoisted(() => ({ investigation: vi.fn() }))
vi.mock('#/api/lab-investigation', async original => ({ ...await original<typeof import('#/api/lab-investigation')>(), getSampleInvestigation: mocks.investigation }))
vi.mock('./InvestigationReports', () => ({ InvestigationReports: ({ canGenerate }: { canGenerate: boolean }) => <button disabled={!canGenerate}>Save investigation report</button> }))
vi.mock('./InvestigationAttachments', () => ({ InvestigationAttachments: () => null }))
vi.mock('./PerformanceReviews', () => ({ PerformanceReviews: () => null }))
vi.mock('./InvestigationEventHistory', () => ({ InvestigationEventHistory: () => null }))
vi.mock('./RelatedInvestigationSamples', () => ({ RelatedInvestigationSamples: () => null }))

const snapshot = {
  formatVersion: 1, workOrderId: 'work', specimenId: 'sample', capturedAtUtc: '2026-10-24T18:00:00Z', coverage: [], limitedSections: [],
  evidence: {
    storageLocations: [{ physicalEventId: 'placed', location: { room: 'Original room', freezer: 'Original freezer', rack: 'Original rack', shelf: 'Original shelf' } }],
    preparationResources: [{ id: 'shared-use', physicalQuantity: 20, physicalQuantityScope: 'Shared command total; not an individual sample allocation.', sampleUses: [{ quantity: 2, quantityScope: 'Sample amount' }] }],
    masterMixes: [{ id: 'mix', workflowRevision: 3 }], reagentComponents: [{ id: 'ingredient', quantity: 1 }],
    resourceLots: [{ id: 'lot', lotNumber: 'LOT-APPLIED' }], sequencingHistory: [{ id: 'sendout' }],
    vendorResults: [{ id: 'vendor-v2', resultVersion: 2, runNotPerformed: true }], custody: [{ id: 'shipment-event', eventCode: 'VENDOR_RUN_NOT_PERFORMED' }],
  },
}
beforeEach(() => { vi.clearAllMocks(); mocks.investigation.mockResolvedValue(snapshot) })
function show(view: 'history' | 'processing' = 'history') {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SampleInvestigation workOrderId="work" specimenId="sample" view={view} /></QueryClientProvider>)
}
it.each(['history', 'processing'] as const)('shows shared resources, ingredient ancestry and scoped vendor history in %s', async view => {
  show(view)
  expect(await screen.findByText('Preparation Resources (1)')).toBeTruthy()
  expect(screen.getByText('Storage Locations (1)')).toBeTruthy()
  expect(screen.getByText('Original shelf')).toBeTruthy()
  expect(screen.getByText('Master Mixes (1)')).toBeTruthy()
  expect(screen.getByText('Reagent Components (1)')).toBeTruthy()
  expect(screen.getByText('Vendor Results (1)')).toBeTruthy()
  expect(screen.getByText('Shared command total; not an individual sample allocation.')).toBeTruthy()
  expect(screen.getAllByText('VENDOR_RUN_NOT_PERFORMED').length).toBeGreaterThan(0)
  expect(mocks.investigation).toHaveBeenCalledWith('work', 'sample')
})
it('disables complete report generation when a shared evidence source reaches its limit', async () => {
  mocks.investigation.mockResolvedValue({ ...snapshot, limitedSections: ['preparationResources'] })
  show()
  await screen.findByText('Preparation Resources (1)')
  expect(screen.getByRole('button', { name: 'Save investigation report' }).hasAttribute('disabled')).toBe(true)
})
it('shows a failed scoped source as unavailable instead of an empty successful history', async () => {
  mocks.investigation.mockRejectedValue(new Error('Saved coverage is unavailable'))
  show()
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByText('Preparation Resources (0)')).toBeNull()
  expect(screen.getByRole('button', { name: 'Save investigation report' }).hasAttribute('disabled')).toBe(true)
})
