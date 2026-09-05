import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { releaseReceipt } from '#/test-helpers/release-receipt'
import { ReleasedDeliverableDetailPage, ReleaseReceiptView } from './ReleasedDeliverableDetailPage'
const api = vi.hoisted(() => ({ read: vi.fn(), hold: vi.fn(), release: vi.fn(), candidates: vi.fn(), reissue: vi.fn() }))
vi.mock('#/api/released-deliverables', () => ({ readReleaseReceipt: api.read, placeReleaseHold: api.hold, releasePreservationHold: api.release, listReissueCandidates: api.candidates, linkReleaseReissue: api.reissue }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { state: 'ready' } }) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a> }))
function view() { const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); return render(<QueryClientProvider client={cache}><ReleasedDeliverableDetailPage snapshotId={releaseReceipt.release.id} q="" page={0} /></QueryClientProvider>) }
describe('Retained release receipt', () => {
  beforeEach(() => { vi.clearAllMocks(); api.read.mockResolvedValue(releaseReceipt); api.candidates.mockResolvedValue([]) })
  it('renders frozen lineage, complete manifest and late completion on the printable receipt', () => {
    render(<ReleaseReceiptView data={releaseReceipt} />)
    expect(screen.getByText('SUPPLIER-001')).toBeTruthy(); expect(screen.getByText('PHAENO-001')).toBeTruthy()
    expect(screen.getByText(releaseReceipt.files[0].name)).toBeTruthy()
    expect(screen.getByText(/Authorized and started before cutoff/)).toBeTruthy()
    expect(screen.getByText(/Display time zone/)).toBeTruthy()
    expect(screen.getByText(/SHA-256:/)).toBeTruthy()
  })
  it('does not manufacture historical lineage or show empty downloader audit to ordinary members', () => {
    render(<ReleaseReceiptView data={{ ...releaseReceipt, lineage: null, downloads: [] }} />)
    expect(screen.getByText(/Lineage was not captured/)).toBeTruthy()
    expect(screen.queryByText('Organization download history')).toBeNull()
  })
  it('shows a member receipt without staff actions', async () => {
    view(); await screen.findByRole('heading', { name: 'Released package receipt' })
    expect(screen.queryByRole('button', { name: 'Place hold' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Print / save PDF' })).toBeTruthy()
  })
  it('preserves the reason and refreshes concurrency state before retrying a hold', async () => {
    const available = { ...releaseReceipt, canManage: true, release: { ...releaseReceipt.release, byteDeletedAtUtc: null }, retention: { ...releaseReceipt.retention, byteDeletedAtUtc: null } }
    api.read.mockResolvedValueOnce(available).mockResolvedValue({ ...available, version: 6 })
    api.hold.mockRejectedValueOnce(new Error('Record changed')).mockResolvedValue({ ...available, version: 7 })
    view(); fireEvent.click(await screen.findByRole('button', { name: 'Place hold' }))
    expect(screen.getByText(/Preservation blocks byte deletion/)).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: /^Reason/ }), { target: { value: 'Preserve during investigation' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await screen.findByRole('alert'); await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2))
    expect((screen.getByRole('textbox', { name: /^Reason/ }) as HTMLInputElement).value).toBe('Preserve during investigation')
    await waitFor(() => expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(api.hold).toHaveBeenLastCalledWith(releaseReceipt.release.id, { version: 6, kind: 'Preservation', reason: 'Preserve during investigation' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
