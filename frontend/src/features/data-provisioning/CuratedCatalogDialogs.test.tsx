import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/data-provisioning'
import { DataProvisioningPage } from './DataProvisioningPage'

vi.mock('#/api/data-provisioning', async importOriginal => ({ ...await importOriginal<typeof api>(), listDatasets: vi.fn(), listSourceSamples: vi.fn(), createDataset: vi.fn(), updateDataset: vi.fn(), deactivateDataset: vi.fn(), retireDatasetVersion: vi.fn() }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canViewDatasetConfiguration: true } } }) }))
vi.mock('@tanstack/react-router', async importOriginal => ({ ...await importOriginal<typeof import('@tanstack/react-router')>(), useBlocker: vi.fn() }))

const version = { id: 'dataset-version-1', curatedDatasetId: 'dataset-1', versionNumber: 1, status: 'Published', contentChecksum: 'synthetic-checksum', version: 7 } as api.CuratedDatasetVersion
const dataset: api.CuratedDataset = { id: 'dataset-1', name: 'Reference dataset', description: 'Reviewed sample data', isActive: true, eligibleVersionId: null, eligibilityApprovedAt: null, versions: [version], createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z', version: 4 }
const cases = [
  { kind: 'create', open: 'New dataset', title: 'Create curated dataset', save: 'Create dataset', field: 'Name', error: 'The curated dataset could not be created.' },
  { kind: 'edit', open: 'Edit details', title: 'Edit curated dataset details', save: 'Save details', field: 'Name', error: 'The curated dataset could not be updated.' },
  { kind: 'deactivate', open: 'Deactivate', title: 'Deactivate this curated dataset?', save: 'Deactivate dataset', field: 'Reason', error: 'The lifecycle change could not be completed.' },
  { kind: 'retire', open: 'Retire version', title: 'Retire this exact version?', save: 'Retire version', field: 'Reason', error: 'The lifecycle change could not be completed.' },
] as const

describe('Curated catalog dialog draft protection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(api.listDatasets).mockResolvedValue([dataset])
    vi.mocked(api.listSourceSamples).mockResolvedValue([])
  })

  it.each(cases)('keeps $kind drafts during cancelled dismissal, pending work, and failures', async scenario => {
    let rejectSave!: (error: Error) => void
    const pending = new Promise<api.CuratedDataset>((_resolve, reject) => { rejectSave = reject })
    const create = vi.mocked(api.createDataset).mockReturnValueOnce(pending)
    const update = vi.mocked(api.updateDataset).mockReturnValueOnce(pending)
    const deactivate = vi.mocked(api.deactivateDataset).mockReturnValueOnce(pending)
    const retire = vi.mocked(api.retireDatasetVersion).mockReturnValueOnce(pending as unknown as Promise<api.CuratedDatasetVersion>)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
      render(<QueryClientProvider client={client}><DataProvisioningPage section="catalog" onSectionChange={vi.fn()} /></QueryClientProvider>)
      await screen.findByText('Reference dataset')
      fireEvent.click(screen.getByRole('button', { name: scenario.open }))
      const dialog = screen.getByRole('dialog', { name: scenario.title })
      fireEvent.change(within(dialog).getByRole('textbox', { name: scenario.field }), { target: { value: 'Reviewed change' } })
      if (scenario.kind === 'create') fireEvent.change(within(dialog).getByRole('textbox', { name: 'Description' }), { target: { value: 'Reviewed description' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      expect(confirm).toHaveBeenCalled()
      expect(screen.getByRole('dialog', { name: scenario.title })).toBeTruthy()
      expect(within(dialog).getByRole('textbox', { name: scenario.field })).toHaveProperty('value', 'Reviewed change')

      act(() => client.setQueryData(['data-provisioning', 'datasets'], [{ ...dataset, version: 12, versions: [{ ...version, version: 15 }] }]))
      fireEvent.click(within(dialog).getByRole('button', { name: scenario.save }))
      await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true))
      expect(within(dialog).getByRole('textbox', { name: scenario.field }).closest('fieldset')).toHaveProperty('disabled', true)
      fireEvent.keyDown(dialog, { key: 'Escape' })
      expect(screen.getByRole('dialog', { name: scenario.title })).toBeTruthy()
      if (scenario.kind === 'create') expect(create.mock.calls[0]?.[0]).toEqual({ name: 'Reviewed change', description: 'Reviewed description' })
      if (scenario.kind === 'edit') expect(update).toHaveBeenCalledWith({ datasetId: dataset.id, version: 4, name: 'Reviewed change', description: dataset.description })
      if (scenario.kind === 'deactivate') expect(deactivate).toHaveBeenCalledWith({ datasetId: dataset.id, version: 4, reason: 'Reviewed change' })
      if (scenario.kind === 'retire') expect(retire).toHaveBeenCalledWith({ datasetId: dataset.id, datasetVersionId: version.id, version: 7, reason: 'Reviewed change' })

      await act(async () => { rejectSave(new Error('Save failed')); await Promise.resolve() })
      const failure = await within(dialog).findByText(scenario.error)
      expect(failure.closest('[data-slot="dialog-header"]')).not.toBeNull()
      expect(within(dialog).getByRole('textbox', { name: scenario.field })).toHaveProperty('value', 'Reviewed change')
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', false)
      confirm.mockReturnValue(true)
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: scenario.open }))
      expect(screen.queryByText(scenario.error)).toBeNull()
      expect(screen.getByRole('textbox', { name: scenario.field })).toHaveProperty('value', scenario.kind === 'edit' ? dataset.name : '')
    } finally { confirm.mockRestore() }
  })
})
