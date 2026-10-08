import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { LabOperationsPage } from './LabOperationsPage'

const api = vi.hoisted(() => ({ dashboard: vi.fn().mockRejectedValue(new Error('Laboratory role required')), createBatch: vi.fn(), transitionBatch: vi.fn(), canOperate: false }))
vi.mock('#/api/lab-operations', async importOriginal => ({ ...await importOriginal<object>(), getLabOperationsDashboard: api.dashboard, createLabBatch: api.createBatch, transitionLabBatch: api.transitionBatch }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageLabOperations: true, canManageOrderConfiguration: true, canOperateLabWork: api.canOperate } } }) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), Link: ({ children }: { children: ReactNode }) => <a href="#test">{children}</a> }))
vi.mock('#/components/WorkspaceSidebar', () => ({ WorkspaceSidebar: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('./LabKitRequestQueues', () => ({ LabKitRequestQueues: ({ apiEnabled }: { apiEnabled: boolean }) => apiEnabled ? <p>Authorized kit queues</p> : null }))

it('opens fulfillment queues without requiring a laboratory dashboard role', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><LabOperationsPage section="kit-requests" onSectionChange={vi.fn()} /></QueryClientProvider>)
  expect(await screen.findByText('Authorized kit queues')).toBeTruthy()
  expect(api.dashboard).not.toHaveBeenCalled()
})

it.each(['', '  PSeq demo  '])('creates a batch with an optional descriptive name: %j', async name => {
  api.canOperate = true
  api.createBatch.mockClear()
  const identifier = 'PH-BAT-20261004-23456789'
  const batch = { id: 'batch', name: name.trim() || identifier, batchNumber: identifier, status: 'Draft', batchType: 'ExternalSequencing', memberCount: 0 }
  let created = false
  api.dashboard.mockImplementation(async () => ({ batches: created ? [batch] : [], suppliers: [] }))
  api.createBatch.mockImplementation(async () => { created = true; return batch })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><LabOperationsPage section="batches" onSectionChange={vi.fn()} /></QueryClientProvider>)
  fireEvent.click(await screen.findByRole('button', { name: 'New batch' }))
  const dialog = await screen.findByRole('dialog')
  const input = within(dialog).getByLabelText('Batch name (optional)')
  expect(input).toHaveProperty('required', false)
  expect(within(dialog).queryByLabelText(/Minimum volume/)).toBeNull()
  fireEvent.change(input, { target: { value: name } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create batch' }))
  await waitFor(() => expect(api.createBatch).toHaveBeenCalledWith({ name: name.trim() || null, notes: null }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(await screen.findByRole('link', { name: identifier })).toBeTruthy()
  if (name.trim()) expect(screen.getByText(text => text.startsWith(`${name.trim()} ·`), { selector: 'p' })).toBeTruthy()
})

it('explains why an empty draft cannot start and disables its empty tube workspace', async () => {
  api.canOperate = true
  api.dashboard.mockResolvedValue({ batches: [{ id: 'empty', name: 'Empty batch', batchNumber: 'PH-BAT-EMPTY', batchType: 'ExternalSequencing', status: 'Draft', memberCount: 0 }], suppliers: [] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><LabOperationsPage section="batches" onSectionChange={vi.fn()} /></QueryClientProvider>)
  expect(await screen.findByText('Add passing libraries from Library prep or Scan libraries before starting this batch.')).toBeTruthy()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'Enter' })
  expect((await screen.findByRole('menuitem', { name: 'Begin shipment preparation' })).getAttribute('aria-disabled')).toBe('true')
  expect(screen.getByRole('menuitem', { name: 'Prepare sequencing tubes' }).getAttribute('aria-disabled')).toBe('true')
})

it('requires a correction reason before returning an empty active batch to draft', async () => {
  api.canOperate = true
  api.transitionBatch.mockClear()
  const batch = { id: 'recover', name: 'Recover batch', batchNumber: 'PH-BAT-RECOVER', batchType: 'ExternalSequencing', status: 'InProgress', memberCount: 0, version: 7 }
  let recovered = false
  api.dashboard.mockImplementation(async () => ({ batches: [{ ...batch, status: recovered ? 'Draft' : 'InProgress' }], suppliers: [] }))
  api.transitionBatch.mockImplementation(async () => { recovered = true; return { ...batch, status: 'Draft' } })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><LabOperationsPage section="batches" onSectionChange={vi.fn()} /></QueryClientProvider>)
  fireEvent.keyDown(await screen.findByRole('button', { name: 'Actions' }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Return empty batch to draft' }))
  const dialog = await screen.findByRole('dialog', { name: 'Return empty batch to draft' })
  expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(dialog.querySelector('[data-slot="dialog-body"]')?.textContent).toContain('PH-BAT-RECOVER')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Return to draft' }))
  expect(await within(dialog).findByText('Correction reason is required.')).toBeTruthy()
  expect(api.transitionBatch).not.toHaveBeenCalled()
  fireEvent.change(within(dialog).getByLabelText(/Correction reason/), { target: { value: '  Started before assignment  ' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Return to draft' }))
  await waitFor(() => expect(api.transitionBatch).toHaveBeenCalledWith('recover', { version: 7, action: 'return-to-draft', reason: 'Started before assignment' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Actions' })))
})
