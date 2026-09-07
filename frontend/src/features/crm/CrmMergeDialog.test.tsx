import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/crm'
import { CrmMergeDialog } from './CrmMergeDialog'

vi.mock('#/api/crm', async importOriginal => ({ ...await importOriginal<typeof api>(), listCrmCompanies: vi.fn(), listCrmContacts: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn() }))

const source = { id: 'source-id', name: 'Duplicate Research', version: 4 }
function setup(recordLabel: 'Company' | 'Contact' = 'Company') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onClose = vi.fn()
  const onSubmit = vi.fn()
  const props = { recordLabel, source, pending: false, onClose, onSubmit }
  const view = render(<QueryClientProvider client={client}><CrmMergeDialog {...props} /></QueryClientProvider>)
  return { ...view, onClose, onSubmit, update: (pending: boolean, error?: string) => view.rerender(<QueryClientProvider client={client}><CrmMergeDialog {...props} pending={pending} error={error} /></QueryClientProvider>) }
}

describe('CRM merge dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.listCrmCompanies).mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    vi.mocked(api.listCrmContacts).mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
  })

  it('requires an explicit directory target and reason before preserving a merge audit', async () => {
    const { onSubmit } = setup()
    expect(screen.getByText(/permanent merge audit/)).toBeTruthy()
    expect(screen.getByText(/Required/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Merge records' }))
    expect(await screen.findByText('Select the record to keep from the search results.')).toBeTruthy()
    expect(screen.getByText('Explain why these records are confirmed duplicates.')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it.each(['Company', 'Contact'] as const)('searches the %s directory beyond the initial choices and excludes the source', async recordLabel => {
    vi.mocked(api.listCrmCompanies).mockImplementation(async input => ({ items: input?.search === 'Zeta' ? [{ id: 'source-id', name: source.name, domainName: null }, { id: 'record-901', name: 'Zeta Research', domainName: 'zeta.example.test' }] as api.CrmCompany[] : [], page: 1, pageSize: 20, totalCount: input?.search === 'Zeta' ? 2 : 0 }))
    vi.mocked(api.listCrmContacts).mockImplementation(async input => ({ items: input?.search === 'Zeta' ? [{ id: 'source-id', displayName: source.name, email: null }, { id: 'record-901', displayName: 'Zeta Research', email: 'zeta@example.test' }] as api.CrmContact[] : [], page: 1, pageSize: 20, totalCount: input?.search === 'Zeta' ? 2 : 0 }))
    const { onSubmit } = setup(recordLabel)
    fireEvent.change(screen.getByRole('combobox', { name: 'Target record' }), { target: { value: 'Zeta' } })
    const result = await screen.findByRole('option', { name: /Zeta Research/ })
    expect(screen.queryByRole('option', { name: /Duplicate Research/ })).toBeNull()
    fireEvent.click(result)
    fireEvent.change(screen.getByLabelText('Merge reason'), { target: { value: ' Confirmed duplicate after review. ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Merge records' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('record-901', 'Confirmed duplicate after review.'))
  })

  it('retries a failed target search without pretending the directory is empty', async () => {
    vi.mocked(api.listCrmCompanies).mockRejectedValueOnce(new Error('offline'))
    setup()
    fireEvent.focus(screen.getByRole('combobox', { name: 'Target record' }))
    expect(await screen.findByText('Company search is unavailable.')).toBeTruthy()
    expect(screen.queryByText('No available companies found.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry company search' }))
    await waitFor(() => expect(api.listCrmCompanies).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByText('Company search is unavailable.')).toBeNull())
  })

  it('preserves a dirty draft after cancelled dismissal, pending work, and a failed merge', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      const { onClose, update } = setup()
      fireEvent.change(screen.getByLabelText('Merge reason'), { target: { value: 'Reviewed the duplicate records.' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(confirm).toHaveBeenCalledWith('Discard unsaved merge choices?')
      expect(onClose).not.toHaveBeenCalled()
      update(true)
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
      expect(screen.getByLabelText('Merge reason').closest('fieldset')).toHaveProperty('disabled', true)
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
      update(false, 'The source changed. Reload before merging.')
      expect(screen.getByText('The source changed. Reload before merging.')).toBeTruthy()
      expect(screen.getByLabelText('Merge reason')).toHaveProperty('value', 'Reviewed the duplicate records.')
      expect(screen.getByRole('button', { name: 'Merge records' })).toHaveProperty('disabled', false)
    } finally { confirm.mockRestore() }
  })
})
