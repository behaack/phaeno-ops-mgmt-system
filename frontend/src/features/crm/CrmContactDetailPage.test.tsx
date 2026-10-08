vi.mock('./use-crm-permissions', () => ({ useCrmPermissions: () => ({ canAccess: true, canAdminister: true }) }))
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/crm'
import { CrmContactDetailPage } from './CrmContactDetailPage'

vi.mock('#/api/crm', async importOriginal => ({ ...await importOriginal<typeof api>(), getCrmContact: vi.fn(), listContactCompanies: vi.fn(), setCrmContactActive: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), useNavigate: () => vi.fn(), Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }))
vi.mock('./CrmCustomFields', () => ({ CrmCustomFields: () => null }))
vi.mock('./CrmRecordWork', () => ({ CrmRecordWork: () => null }))
vi.mock('./CrmContactDialog', () => ({ CrmContactDialog: () => null }))
vi.mock('./CrmMergeDialog', () => ({ CrmMergeDialog: () => null }))

const contact = { id: 'contact-1', firstName: 'Ada', lastName: 'Researcher', displayName: 'Ada Researcher', email: 'ada@example.test', phone: null, primaryCompanyName: null, primaryCompanyTitle: null, ownerUserId: 'owner-1', ownerName: 'Sales owner', communicationPreference: 'Unknown', lawfulContactBasis: null, communicationNotes: null, tags: [], aliases: [], mergedIntoContactId: null, isActive: true, createdAt: '2026-09-07', updatedAt: '2026-09-07', version: 4 } as api.CrmContact
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return { client, ...render(<QueryClientProvider client={client}><CrmContactDetailPage contactId={contact.id} /></QueryClientProvider>) }
}

describe('Contact detail recovery and lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getCrmContact).mockResolvedValue(contact)
    vi.mocked(api.listContactCompanies).mockResolvedValue([])
  })

  it('retries relationship failure without implying there are no Companies', async () => {
    vi.mocked(api.listContactCompanies).mockRejectedValueOnce(new Error('offline'))
    setup()
    expect(await screen.findByText('Could not load Company relationships')).toBeTruthy()
    expect(screen.queryByText('No Company association has been recorded.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Associate' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry Company relationships' }))
    expect(await screen.findByText('No Company association has been recorded.')).toBeTruthy()
  })

  it('retries a failed Contact load while retaining a way back to the directory', async () => {
    vi.mocked(api.getCrmContact).mockRejectedValueOnce(new Error('offline'))
    setup()
    expect(await screen.findByText('Could not load Contact')).toBeTruthy()
    expect(screen.getByText('Back to contacts')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry Contact' }))
    expect(await screen.findByRole('heading', { name: 'Ada Researcher' })).toBeTruthy()
  })

  it('keeps the reviewed action and version when Contact data refreshes during confirmation', async () => {
    vi.mocked(api.setCrmContactActive).mockRejectedValue(new Error('Record changed'))
    const { client } = setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))
    act(() => client.setQueryData(['crm-contact', contact.id], { ...contact, isActive: false, version: 5 }))
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate contact' }))
    await waitFor(() => expect(api.setCrmContactActive).toHaveBeenCalledWith('contact-1', false, 4))
    expect(await screen.findByText('Record changed')).toBeTruthy()
  })

  it('retains a Company association draft when discarding is declined', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      setup()
      await screen.findByText('No Company association has been recorded.')
      fireEvent.click(screen.getByRole('button', { name: 'Associate' }))
      fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'Scientific director' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(confirm).toHaveBeenCalledWith('Discard unsaved Company association changes?')
      expect(screen.getByLabelText('Job title')).toHaveProperty('value', 'Scientific director')
      expect(screen.getByRole('dialog', { name: 'Associate Company' })).toBeTruthy()
    } finally { confirm.mockRestore() }
  })

  it('cancels without writing and requires explicit Contact deactivation', async () => {
    vi.mocked(api.setCrmContactActive).mockResolvedValue({ ...contact, isActive: false, version: 5 })
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))
    expect(screen.getByRole('dialog', { name: 'Deactivate contact' })).toBeTruthy()
    expect(api.setCrmContactActive).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(api.setCrmContactActive).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate contact' }))
    await waitFor(() => expect(api.setCrmContactActive).toHaveBeenCalledWith('contact-1', false, 4))
    await screen.findByRole('button', { name: 'Reactivate' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
