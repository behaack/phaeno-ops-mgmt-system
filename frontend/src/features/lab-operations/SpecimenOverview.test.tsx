import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { LabAttemptSpecimen, LabAttemptWorkspace } from '#/api/lab-operations'
import type { ScientificWorkspace } from '#/api/lab-scientific-evidence'
import { SpecimenOverview } from './SpecimenOverview'

const mocks = vi.hoisted(() => ({ science: vi.fn(), investigation: vi.fn(), lineage: vi.fn(), sequencing: vi.fn() }))
vi.mock('#/api/lab-scientific-evidence', async original => ({ ...await original<typeof import('#/api/lab-scientific-evidence')>(), getScientificWorkspace: mocks.science }))
vi.mock('#/api/lab-investigation', async original => ({ ...await original<typeof import('#/api/lab-investigation')>(), getSampleInvestigation: mocks.investigation, getResultLineage: mocks.lineage }))
vi.mock('#/api/lab-operations', async original => ({ ...await original<typeof import('#/api/lab-operations')>(), getLabJobSequencing: mocks.sequencing }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#scientific-record">{children}</a> }))
const specimen = { id: 'specimen', name: 'Test specimen', receivedTubes: 2, expectedTubes: 2, eligibleTubes: 1, tubes: [{ id: 'reserve', barcode: 'UNUSED-RESERVE', use: 'Reserve' }],
  attempts: [{ id: 'failed', sequence: 1, sourceContainerId: 'first-tube', sourceBarcode: 'FIRST-TUBE', state: 'Failed', failureEvidence: 'Recorded failed preparation', executionIds: [] },
    { id: 'successful', sequence: 2, sourceContainerId: 'actual-tube', sourceBarcode: 'ACTUAL-TUBE', state: 'Succeeded', executionIds: [] }],
} as unknown as LabAttemptSpecimen
const science = { libraries: [{ id: 'library', libraryKey: 'SAME-DISPLAY-NAME', status: 'QcPassed', labSpecimenAttemptId: 'successful' }, { id: 'unlinked', libraryKey: 'SAME-DISPLAY-NAME', status: 'QcPassed', labSpecimenAttemptId: null }],
  outputs: [{ id: 'output', labLibraryId: 'library', labSpecimenAttemptId: 'successful', sourceContainerId: 'actual-tube', providerRunReference: 'ACTUAL-RUN', sequencingRunNumber: 2, correctsOutputId: 'prior-output' }, { id: 'wrong-source', labLibraryId: 'library', labSpecimenAttemptId: 'successful', sourceContainerId: 'first-tube', providerRunReference: 'UNLINKED-RUN' }],
  analyses: [{ id: 'analysis', runReference: 'EXACT-ANALYSIS', previousAnalysisRunId: 'prior-analysis' }], inputs: [{ labAnalysisRunId: 'analysis', labSequencingOutputId: 'output' }],
} as unknown as ScientificWorkspace
beforeEach(() => {
  vi.clearAllMocks()
  mocks.science.mockResolvedValue(science)
  mocks.sequencing.mockResolvedValue([])
  mocks.investigation.mockResolvedValue({ capturedAtUtc: '2026-10-09T12:00:00Z', limitedSections: [], evidence: { results: [{ id: 'delivered-v1', packageVersion: 1, labAnalysisRunId: 'analysis', state: 'Released', releasedAtUtc: '2026-10-09T10:00:00Z' }, { id: 'unknown-result', packageVersion: 2, labAnalysisRunId: null }] } })
  mocks.lineage.mockResolvedValue({ resultId: 'delivered-v1', sourceBarcode: 'ACTUAL-TUBE', attemptId: 'successful', analysisRunId: 'analysis', coverage: 'Captured', inputs: [{ id: 'output' }], artifacts: [] })
})
function show() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SpecimenOverview workOrderId="work" specimen={specimen} workspace={{ policyKey: 'authorized-runs' } as LabAttemptWorkspace} /></QueryClientProvider>) }
it('retains failed and reserve branches and links outputs by exact identities rather than display name', async () => {
  show()
  const successful = await screen.findByRole('region', { name: 'Attempt 2' })
  expect(await within(successful).findByRole('link', { name: 'ACTUAL-RUN' })).toBeTruthy()
  expect(within(successful).queryByRole('link', { name: 'UNLINKED-RUN' })).toBeNull()
  expect(screen.getByText('Failure evidence: Recorded failed preparation')).toBeTruthy()
  expect(screen.getByText(/Outputs without a matching recorded source branch/)).toBeTruthy()
  fireEvent.click(screen.getByText('Unused and reserve tubes'))
  expect(screen.getByText(/UNUSED-RESERVE/)).toBeTruthy()
  expect(mocks.sequencing).toHaveBeenCalledWith('work', 'specimen')
})
it('resolves the chosen delivered version and highlights its actual attempt', async () => {
  show()
  const select = await screen.findByLabelText('Trace an exact result version')
  fireEvent.change(select, { target: { value: 'delivered-v1' } })
  expect(await screen.findByText('Source tube: ACTUAL-TUBE')).toBeTruthy()
  expect(mocks.lineage).toHaveBeenCalledWith('work', 'specimen', 'delivered-v1')
  await waitFor(() => expect(screen.getByLabelText('Attempt 2').className).toContain('border-primary'))
  expect(screen.getByLabelText('Attempt 1').className).not.toContain('border-primary')
})
it('shows read failures as unavailable without claiming missing result attribution', async () => {
  mocks.science.mockRejectedValue(new Error('Scientific source unavailable'))
  show()
  expect(await screen.findByRole('button', { name: 'Retry trace' })).toBeTruthy()
  expect(screen.queryByText(/Results without a recorded producing analysis/)).toBeNull()
})
