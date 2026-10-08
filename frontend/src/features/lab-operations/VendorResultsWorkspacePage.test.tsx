import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { VendorResultsWorkspacePage } from './VendorResultsWorkspacePage'
import { vendorResultsWorkspace } from './vendor-results-test-fixture'

const mocked = vi.hoisted(() => ({ record: vi.fn(), draft: vi.fn(), restart: vi.fn(), batch: vi.fn(), intake: vi.fn(), navigate: vi.fn() }))
vi.mock('@tanstack/react-router', async original => ({ ...await original<object>(), useNavigate: () => mocked.navigate, useBlocker: () => ({ status: 'idle' }), Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canOperateLabWork: true } } }) }))
vi.mock('#/api/lab-operations', async original => ({ ...await original<object>(), getLabBatchDetail: mocked.batch, recordVendorResults: mocked.record }))
vi.mock('#/api/lab-fastq', async original => ({ ...await original<object>(), getFastqIntake: mocked.intake, saveResultsDraft: mocked.draft, restartResultsDraft: mocked.restart }))
const intake = { sendoutVersion: 7, protectedPackages: [], archives: [], effectiveMaximumArchiveBytes: 100 * 1024 ** 2, draft: null, tentative: true, effectiveMaximumFileBytes: 100 * 1024 ** 2,
  policy: { maximumFileBytes: 1024 ** 3, maximumFileSetBytes: 16 * 1024 ** 3, maximumFilesPerSet: 256, draftLifetimeHours: 24, allowedReadLayouts: ['PairedEnd', 'SingleEnd'], allowedCompression: ['Gzip', 'None'], allowMultipleGroups: true, allowSplitParts: true },
  members: [{ id: 'member', labWorkOrderId: 'work', labSpecimenId: 'sample', libraryKey: 'LIB-1', sampleName: 'Sample 1', purchasedRuns: 1 }], sets: [] }
beforeEach(() => { vi.clearAllMocks(); mocked.batch.mockResolvedValue(vendorResultsWorkspace); mocked.intake.mockResolvedValue(intake); mocked.record.mockResolvedValue(vendorResultsWorkspace.batch); mocked.draft.mockImplementation(async (_id, body) => ({ id: body.id, version: 1, expiresAtUtc: '2026-10-07T12:00:00Z', payload: body.payload })) })
async function show() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VendorResultsWorkspacePage batchId="batch" /></QueryClientProvider>); await screen.findByLabelText(/Vendor job reference/) }
it('requires a no-run reason and submits no times or FASTQ sets', async () => {
  await show(); fireEvent.change(screen.getByLabelText(/Vendor job reference/), { target: { value: 'VENDOR-1' } }); fireEvent.click(screen.getByRole('checkbox', { name: 'Run not performed' }))
  expect(screen.queryByLabelText(/Run started/)).toBeNull(); expect(screen.queryByLabelText(/Results received/)).toBeNull(); expect(screen.queryByText('FASTQ uploads')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Record results' })); expect(mocked.record).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/Reason run not performed/), { target: { value: 'SIMULATED vendor cancellation before execution.' } }); fireEvent.click(screen.getByRole('button', { name: 'Record results' }))
  await waitFor(() => expect(mocked.record).toHaveBeenCalledWith('sendout', expect.objectContaining({ outcome: 'Failure', runNotPerformed: true, runStartedAtUtc: null, runCompletedAtUtc: null, resultsReceivedAtUtc: null, fastqSetIds: [] })))
})
it('blocks successful receipt before file-set completion and does not request an external location', async () => {
  await show(); fireEvent.change(screen.getByLabelText(/Vendor job reference/), { target: { value: 'VENDOR-2' } })
  for (const label of ['Run started', 'Run completed', 'Results received']) fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value: '2026-10-05T12:00:00' } })
  fireEvent.change(screen.getByLabelText(/Batch outcome/), { target: { value: 'Success' } }); fireEvent.click(screen.getByRole('button', { name: 'Record results' }))
  await screen.findByText(/Select a complete verified file set/); expect(mocked.record).not.toHaveBeenCalled(); expect(screen.queryByPlaceholderText('Sequencing data location')).toBeNull()
})
it('saves an incomplete draft without recording receipt', async () => {
  await show(); fireEvent.change(screen.getByLabelText(/Vendor job reference/), { target: { value: 'PARTIAL-VENDOR' } }); fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByText(/Draft saved/); expect(mocked.draft).toHaveBeenCalledWith('sendout', expect.objectContaining({ payload: expect.objectContaining({ jobReference: 'PARTIAL-VENDOR' }) })); expect(mocked.record).not.toHaveBeenCalled()
})

it('restarts an outdated draft explicitly with preserved current entries and a fresh identity', async () => {
  const old = { id: 'old-draft', version: 4, stale: true, expiresAtUtc: '2100-01-01T00:00:00Z', payload: {} }
  mocked.intake.mockResolvedValue({ ...intake, draft: old })
  mocked.restart.mockImplementation(async (_sendout, body) => { mocked.intake.mockResolvedValue({ ...intake, draft: { ...old, id: body.id, version: 1, stale: false } }); return { id: body.id } })
  await show()
  fireEvent.change(screen.getByLabelText(/Vendor job reference/), { target: { value: 'VENDOR-RECOVERY' } })
  expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Restart draft' }))
  const dialog = await screen.findByRole('dialog')
  expect(dialog.querySelector('[data-slot="dialog-body"]')).not.toBeNull()
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep reviewing' })))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Restart draft' }))
  await waitFor(() => expect(mocked.restart).toHaveBeenCalledWith('sendout', expect.objectContaining({ sourceDraftId: 'old-draft', sourceVersion: 4, sendoutVersion: 7, payload: expect.objectContaining({ jobReference: 'VENDOR-RECOVERY' }) })))
  expect(mocked.restart.mock.calls[0][1].id).not.toBe('old-draft')
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Vendor job reference/)))
})

it('shows approved package context while still allowing notes-only edits', async () => {
  mocked.intake.mockResolvedValue({ ...intake, protectedPackages: [{ id: 'package', packageVersion: 2, state: 'Released', trialProjectId: null }] })
  await show()
  expect(screen.getByLabelText('Approved results affected by corrections').textContent).toContain('must withdraw affected packages')
  expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(false)
})
