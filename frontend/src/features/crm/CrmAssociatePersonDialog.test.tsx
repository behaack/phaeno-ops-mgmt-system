import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCrmContacts } from '#/api/crm'
import { CrmAssociatePersonDialog } from './CrmAssociatePersonDialog'

vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle' }) }))

vi.mock('#/api/crm', () => ({
  listCrmContacts: vi.fn(), listCrmCompanies: vi.fn(), apiErrorMessage: () => 'Could not save the Contact.',
}))

function setup(excludedContactIds: string[] = []) {
  const onSubmit = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <CrmAssociatePersonDialog open companyName="Atlas Research" excludedContactIds={excludedContactIds} pending={false}
      error={null} onOpenChange={vi.fn()} onSubmit={onSubmit} onModeChange={vi.fn()} onCloseAutoFocus={vi.fn()} />
  </QueryClientProvider>)
  fireEvent.focus(screen.getByRole('combobox', { name: 'Contact' }))
  return onSubmit
}

describe('Create a Contact from Company association search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listCrmContacts).mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
  })

  it('preserves Company relationship details and submits one combined creation', async () => {
    const onSubmit = setup()
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'Scientist' } })
    fireEvent.change(screen.getByLabelText('Relationship role'), { target: { value: 'Scientific lead' } })
    fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-10-01' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Primary Company for this Contact' }))
    fireEvent.focus(screen.getByRole('combobox', { name: 'Contact' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Create new contact' }))
    expect(screen.getByText(/associated with Atlas Research/)).toBeTruthy()
    expect((screen.getByLabelText('Job title') as HTMLInputElement).value).toBe('Scientist')
    expect((screen.getByLabelText('Relationship role') as HTMLSelectElement).value).toBe('Scientific lead')
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Doe' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create and associate contact' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ kind: 'new', input: {
      firstName: 'Jane', lastName: 'Doe', email: null, phone: null, jobTitle: 'Scientist',
      relationshipRole: 'Scientific lead', isPrimaryCompany: true, effectiveFrom: '2026-10-01',
    } }))
  })

  it('does not offer creation when the Contact search fails', async () => {
    vi.mocked(listCrmContacts).mockRejectedValue(new Error('Search unavailable'))
    const onSubmit = setup()
    expect(await screen.findByText('Contact search is unavailable.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create new contact' })).toBeNull()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires the new person identity before creating an association', async () => {
    const onSubmit = setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Create new contact' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create and associate contact' }))
    expect(await screen.findByText('Enter a first name.')).toBeTruthy()
    expect(screen.getByText('Enter a last name.')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not suggest duplicate creation for an already-associated match', async () => {
    vi.mocked(listCrmContacts).mockResolvedValue({ items: [{
      id: 'already-associated', firstName: 'Jane', lastName: 'Doe', displayName: 'Jane Doe',
      email: null, phone: null, primaryCompanyName: 'Atlas Research', primaryCompanyTitle: null,
      ownerUserId: 'owner', ownerName: 'Owner', communicationPreference: 'Unknown',
      lawfulContactBasis: null, communicationNotes: null, tags: [], aliases: [],
      mergedIntoContactId: null, isActive: true, createdAt: '2026-10-08', updatedAt: '2026-10-08', version: 1,
    }], page: 1, pageSize: 20, totalCount: 1 })
    setup(['already-associated'])
    expect(await screen.findByText(/Matching Contacts are already associated/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create new contact' })).toBeNull()
  })
})
