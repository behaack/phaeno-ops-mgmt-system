import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ResearchEntryEditor } from './ResearchEntryEditor'
import { ResearchEntryDialog } from './ResearchEntryDialog'
import type { EntryDetail, ExperimentDetail } from './research-api'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), navigate: vi.fn() }))
const entryId = '11111111-1111-4111-8111-111111111111'
const experimentId = '22222222-2222-4222-8222-222222222222'
const entryPath = `/research/experiments/${experimentId}/entries/${entryId}`
const initial = (): EntryDetail => ({ experiment: { id: experimentId, researchProjectId: 'project', title: 'Pilot', status: 'Active', version: 1, experimentDate: null, lastActivityAtUtc: '2026-10-16T12:00:00Z' }, authors: [], entry:
  { id: entryId, researchExperimentId: experimentId, title: 'Notebook', entryDate: '2026-10-16', version: 1, createdAt: '2026-10-16T12:00:00Z', updatedAt: '2026-10-16T12:00:00Z', createdByUserId: null, updatedByUserId: null, blocks: [
    { id: '33333333-3333-4333-8333-333333333333', kind: 'text', section: 'observations', label: 'Observations', text: 'Original note', columns: null, rows: null, attachmentId: null },
  ] } })
let current: EntryDetail
const envelope = (data: unknown) => ({ data: { success: true, data: structuredClone(data) } })
vi.mock('#/api/client', () => ({ api: { get: (...args: unknown[]) => mocks.get(...args), put: (...args: unknown[]) => mocks.put(...args), post: (...args: unknown[]) => mocks.post(...args) } }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { state: 'ready', capabilities: { canAccessResearch: true } }, selectedOrganizationId: 'phaeno', authProvider: 'clerk' }) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate, useRouterState: ({ select }: { select: (state: unknown) => unknown }) => select({ location: { search: {} } }), Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }))
vi.mock('#/features/orders/use-modal-draft-guard', () => ({ useModalDraftGuard: () => ({ allowNavigation: vi.fn(), close: async (fn: () => void) => fn() }) }))

function mountEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><ResearchEntryEditor experimentId={experimentId} entryId={entryId} /></QueryClientProvider>)
  return client
}
async function keepEdits() {
  const review = screen.getByRole('heading', { name: 'Review the latest saved notebook' }).closest('section')!
  fireEvent.keyDown(within(review).getByRole('button', { name: 'Actions' }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'I reviewed the latest entry; keep my edits' }))
}
async function dirtyAndSave() {
  fireEvent.change(await screen.findByLabelText('Notes'), { target: { value: 'My retained observation µL' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await screen.findByRole('heading', { name: 'Review the latest saved notebook' })
}

describe('research entry recovery and validation', () => {
  beforeEach(() => {
    vi.clearAllMocks(); current = initial()
    mocks.get.mockImplementation(async (path: string) => {
      if (path === entryPath) return envelope(current)
      if (path === '/research/attachments/options') return envelope({ maximumBytes: 1000000 })
      if (path.endsWith('/attachments')) return envelope([])
      throw new Error(`Unexpected unbounded read: ${path}`)
    })
    mocks.put.mockImplementation(async (_path: string, values: EntryDetail['entry']) => {
      current.entry = { ...current.entry, ...values, version: current.entry.version + 1 }
      current.experiment.version++
      return envelope(current)
    })
    mocks.post.mockImplementation(async () => { current.experiment.status = 'Active'; current.experiment.version++; return envelope({ experiment: current.experiment }) })
  })
  it('retains notes through an Active conflict and requires explicit review of the current versions', async () => {
    mocks.put.mockImplementationOnce(async () => {
      current.experiment.version = 2; current.entry.version = 2; current.entry.blocks[0].text = 'Their observation'
      throw { isAxiosError: true, response: { status: 409 } }
    })
    mountEditor(); await dirtyAndSave()
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('My retained observation µL')
    expect((screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(true)
    await keepEdits(); fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(2))
    expect(mocks.put.mock.calls[1][1]).toMatchObject({ version: 2, experimentVersion: 2, blocks: [expect.objectContaining({ text: 'My retained observation µL' })] })
  })
  it('reopens a completed experiment inside the editor without discarding the draft', async () => {
    mocks.put.mockImplementationOnce(async () => {
      current.experiment.status = 'Completed'; current.experiment.version = 2
      throw { isAxiosError: true, response: { status: 409 } }
    })
    mountEditor(); await dirtyAndSave()
    fireEvent.click(await screen.findByRole('button', { name: 'Reopen experiment' }))
    const dialog = await screen.findByRole('dialog', { name: 'Reopen experiment?' })
    expect(dialog.querySelector('[data-slot="dialog-body"]')?.textContent).toContain('Your unsaved entry remains')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reopen experiment' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('My retained observation µL')
    await keepEdits(); fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(2))
    expect(mocks.put.mock.calls[1][1]).toMatchObject({ version: 1, experimentVersion: 3 })
  })
  it('recovers a Completed conflict when another researcher reopens it elsewhere', async () => {
    mocks.put.mockImplementationOnce(async () => { current.experiment.status = 'Completed'; current.experiment.version = 2; throw { isAxiosError: true, response: { status: 409 } } })
    const client = mountEditor(); await dirtyAndSave()
    current.experiment.status = 'Active'; current.experiment.version = 3
    await act(() => client.invalidateQueries({ queryKey: ['research'] }))
    await keepEdits()
    expect((screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('My retained observation µL')
  })
  it('names and focuses an invalid section label, then clears its error after correction', async () => {
    mountEditor()
    const label = await screen.findByLabelText(/Section label/)
    fireEvent.change(label, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Enter a section label.')
    await waitFor(() => expect(document.activeElement).toBe(label))
    expect(label.getAttribute('aria-invalid')).toBe('true')
    expect(label.getAttribute('aria-describedby')).toBe('label-33333333-3333-4333-8333-333333333333-error')
    expect(mocks.put).not.toHaveBeenCalled()
    fireEvent.change(label, { target: { value: 'Corrected label' } })
    await waitFor(() => expect(screen.queryByText('Enter a section label.')).toBeNull())
  })
  it('makes no write when entry creation is canceled', async () => {
    const client = new QueryClient()
    const close = vi.fn()
    const detail = { experiment: current.experiment, project: { id: 'project', name: 'Research', description: null, version: 1, updatedAt: current.entry.updatedAt }, entryCount: 1 } satisfies ExperimentDetail
    render(<QueryClientProvider client={client}><ResearchEntryDialog detail={detail} onClose={close} onSaved={vi.fn()} refresh={vi.fn()} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(close).toHaveBeenCalledOnce(); expect(mocks.post).not.toHaveBeenCalled()
  })
})
