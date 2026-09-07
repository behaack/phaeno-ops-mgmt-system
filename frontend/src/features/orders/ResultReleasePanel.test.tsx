import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultPackage } from '#/api/pseq-order-to-cash'
import { ResultPackageDetailPage, ResultReleasePanel } from './ResultReleasePanel'

const mocks = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), release: vi.fn(), withdraw: vi.fn(), reissue: vi.fn(), navigate: vi.fn(), capabilities: { canReleasePSeqResults: true, canManageFileManagementConfiguration: false, canManageLabOperations: false, canViewAllOperationalOrders: false } }))
vi.mock('#/api/pseq-order-to-cash', () => ({ listResultPackages: mocks.list, getResultPackage: mocks.get, releaseResultPackage: mocks.release, withdrawResultPackage: mocks.withdraw, authorizeResultReissue: mocks.reissue }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: mocks.capabilities } }) }))
vi.mock('@tanstack/react-router', () => ({ useSearch: () => ({ resultState: 'ReadyForRelease' }), useNavigate: () => mocks.navigate, Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }))
vi.mock('#/features/file-management/ReleasedDeliverableDetailPage', () => ({ ReleasedDeliverableDetailPage: () => <section aria-label="Retention controls">Retention controls</section> }))
const item: ResultPackage = { id: 'package-id', organizationId: 'customer-id', labServiceOrderId: 'job-id', labWorkOrderId: 'work-id', labSampleId: 'sample-id', packageVersion: 2, correctsPackageId: null, state: 'ReadyForRelease', pipelineProviderKey: 'PSeq', pipelineSubmissionId: 'run-123', manifestSha256: 'a'.repeat(64), expectedArtifactCount: 1, scientificApprovalId: 'approval-id', releasedAtUtc: null, failureCode: null, failureDetail: null, retentionState: null, version: 3, artifacts: [{ id: 'file-id', fileName: 'sample.bam', logicalRole: 'BAM', contentType: 'application/octet-stream', sizeBytes: 1234, sha256: 'b'.repeat(64), scanState: 'Clean', scanCompletedAtUtc: '2026-09-07T12:00:00Z', deletedAtUtc: null }], context: { organizationName: 'Research Customer', orderNumber: 'JOB-123', customerReference: 'Transcript experiment', customerSampleId: 'RNA-01', retentionSnapshotId: null, scientificReviewer: 'Scientific Reviewer', scientificallyApprovedAtUtc: '2026-09-07T12:00:00Z', releaseDefinitionKey: 'pseq', releaseDefinitionVersion: 1 } }
function view(element: ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{element}</QueryClientProvider>) }
beforeEach(() => { vi.clearAllMocks(); Object.assign(mocks.capabilities, { canReleasePSeqResults: true, canManageFileManagementConfiguration: false }); mocks.get.mockResolvedValue(item); mocks.list.mockResolvedValue([item]) })
describe('Connected result package workspace', () => {
  it('opens a recognizable package from a form-free queue', async () => {
    view(<ResultReleasePanel apiEnabled />)
    expect(await screen.findByRole('link', { name: 'JOB-123 · RNA-01 · version 2' })).toBeTruthy()
    expect(screen.getByText(/Research Customer/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Release to Customer' })).toBeNull()
    expect(mocks.list).toHaveBeenCalledWith('ReadyForRelease')
  })
  it('requires confirmation in the package context and refreshes a stale version before retry', async () => {
    mocks.get.mockResolvedValueOnce(item).mockResolvedValue({ ...item, version: 4 })
    mocks.release.mockRejectedValueOnce(new Error('Changed')).mockResolvedValue({ ...item, state: 'Released', version: 5 })
    view(<ResultPackageDetailPage packageId={item.id} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Release to Customer' }))
    expect(mocks.release).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog').textContent).toContain('Research Customer')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await screen.findByRole('alert')
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(mocks.release).toHaveBeenLastCalledWith(item.id, 4))
  })
  it('preserves independent file-administrator and release-manager permissions', async () => {
    Object.assign(mocks.capabilities, { canReleasePSeqResults: false, canManageFileManagementConfiguration: true })
    mocks.get.mockResolvedValue({ ...item, state: 'Released', context: { ...item.context, retentionSnapshotId: 'snapshot-id' } })
    view(<ResultPackageDetailPage packageId={item.id} />)
    expect(await screen.findByRole('region', { name: 'Retention controls' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Release to Customer' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull()
  })
})
