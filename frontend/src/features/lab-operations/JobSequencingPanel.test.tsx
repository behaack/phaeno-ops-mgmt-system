import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { LabJobSequencingBatch, LabLibrary, LabSpecimen } from '#/api/lab-operations'
import { JobSequencingPanel } from './JobSequencingPanel'

const mocks = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('#/api/lab-operations', async original => ({ ...await original<typeof import('#/api/lab-operations')>(), getLabJobSequencing: mocks.read }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { batchId?: string } }) => <a href={to.replace('$batchId', params?.batchId ?? '')}>{children}</a> }))
const libraries: LabLibrary[] = ['assigned', 'unassigned'].map(id => ({ id, labSpecimenId: 'specimen', sourceContainerId: 'source', libraryContainerId: 'tube-' + id, preparationExecutionId: 'execution', libraryKey: 'LIB-' + id, status: 'QcPassed', qcResultsJson: null, version: 1 }))
const specimens: LabSpecimen[] = [{ id: 'specimen', submittedSpecimenId: 'submitted', accessionNumber: 'SPEC-001', receivedAtUtc: null, intakeDisposition: 'Accepted', receiptCondition: null, intakeReasonCode: null, currentLocation: null, version: 1 }]
const assignment: LabJobSequencingBatch = {
  batch: { id: 'batch-1', batchNumber: 'BATCH-001', name: 'BATCH-001', batchType: 'Sequencing', status: 'Complete', startedAtUtc: null, completedAtUtc: null, notes: null, memberCount: 5, sendoutId: 'sendout', sendoutStatus: 'Complete', sendoutVersion: 1, version: 1, libraryExceptionCount: 1, vendorOutcome: 'Success', providerName: 'Test vendor', trackingReference: null, expectedCompletionAtUtc: null, resultsReceivedAtUtc: null, runNotPerformed: false, resultsVersion: 2 },
  sequencingStartedAtUtc: null, sequencingCompletedAtUtc: null,
  libraries: [{ memberId: 'member', libraryId: 'assigned', specimenId: 'specimen', libraryKey: 'LIB-assigned', sequencingTubeBarcode: 'SEQ-001', outcome: 'Failure', outcomeReason: 'Latest recorded library exception' }],
}
beforeEach(() => { vi.clearAllMocks(); mocks.read.mockResolvedValue([assignment]) })
function show(items = libraries) { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); render(<QueryClientProvider client={client}><JobSequencingPanel workOrderId="job-1" libraries={items} specimens={specimens} /></QueryClientProvider>) }
it('requests the owning Job and keeps member failure distinct from batch success', async () => {
  show()
  expect(await screen.findByRole('link', { name: 'BATCH-001' })).toHaveProperty('href', expect.stringContaining('/lab-operations/batches/batch-1'))
  expect(mocks.read).toHaveBeenCalledWith('job-1')
  expect(screen.getByText('1 Job library · 5 total batch libraries')).toBeTruthy()
  expect(screen.getByText('1 linked batch · 1 assigned library · 1 unassigned library')).toBeTruthy()
  expect(screen.getAllByText('Failure').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Latest recorded library exception').length).toBeGreaterThan(0)
  expect(screen.getByText('LIB-unassigned')).toBeTruthy()
})
it('keeps unknown outcomes and run not performed explicit', async () => {
  mocks.read.mockResolvedValue([{ ...assignment, batch: { ...assignment.batch, runNotPerformed: true }, libraries: [{ ...assignment.libraries[0], outcome: null, outcomeReason: null }] }])
  show()
  await screen.findByRole('link', { name: 'BATCH-001' })
  expect(screen.getAllByText('Run not performed').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0)
  expect(screen.queryByText('Success')).toBeNull()
})
it('shows failure without falsely marking every library unassigned', async () => {
  mocks.read.mockRejectedValue(new Error('Unavailable'))
  show()
  expect(await screen.findByRole('button', { name: 'Retry sequencing' })).toBeTruthy()
  expect(screen.queryByText('Libraries awaiting batch assignment')).toBeNull()
})
it('distinguishes no libraries from libraries awaiting assignment', async () => {
  mocks.read.mockResolvedValue([])
  show([])
  expect(await screen.findByText('No libraries have been recorded for this Job.')).toBeTruthy()
  await waitFor(() => expect(screen.queryByText('Libraries awaiting batch assignment')).toBeNull())
})

it('requests specimen-scoped batch membership from the server', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><JobSequencingPanel workOrderId="job-1" specimenId="specimen" libraries={libraries} specimens={specimens} /></QueryClientProvider>)
  expect(await screen.findByText('1 specimen library · 5 total batch libraries')).toBeTruthy()
  expect(mocks.read).toHaveBeenCalledWith('job-1', 'specimen')
})
