import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/crm'
import { CrmOpportunityContacts } from './CrmOpportunityContacts'

vi.mock('#/api/crm', async importOriginal => ({ ...await importOriginal<typeof api>(), listCrmOpportunityContacts: vi.fn(), listCrmContacts: vi.fn(), addCrmOpportunityContact: vi.fn(), removeCrmOpportunityContact: vi.fn(), updateCrmOpportunityContact: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }))

function setup() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><CrmOpportunityContacts opportunityId="opportunity-1" /></QueryClientProvider>)
}

describe('Opportunity contact workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.listCrmOpportunityContacts).mockResolvedValue([])
    vi.mocked(api.listCrmContacts).mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
  })

  it('distinguishes failed association reads from no contacts and retries before enabling association', async () => {
    vi.mocked(api.listCrmOpportunityContacts).mockRejectedValueOnce(new Error('offline'))
    setup()
    expect(await screen.findByText('Could not load Opportunity contacts')).toBeTruthy()
    expect(screen.queryByText('No contacts associated with this Opportunity.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Associate' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry Opportunity contacts' }))
    expect(await screen.findByText('No contacts associated with this Opportunity.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Associate' })).toHaveProperty('disabled', false)
  })

  it('searches the directory for a Contact beyond initial choices and preserves failed entries', async () => {
    vi.mocked(api.listCrmContacts).mockImplementation(async input => ({ items: input?.search === 'Zeta' ? [{ id: 'contact-901', displayName: 'Zeta Researcher', email: 'zeta@example.test' } as api.CrmContact] : [], page: 1, pageSize: 20, totalCount: input?.search === 'Zeta' ? 1 : 0 }))
    vi.mocked(api.addCrmOpportunityContact).mockRejectedValue(new Error('Save unavailable'))
    setup()
    await screen.findByText('No contacts associated with this Opportunity.')
    fireEvent.click(screen.getByRole('button', { name: 'Associate' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Contact' }), { target: { value: 'Zeta' } })
    fireEvent.click(await screen.findByRole('option', { name: /Zeta Researcher/ }))
    fireEvent.change(screen.getByLabelText('Role (optional)'), { target: { value: 'Scientific lead' } })
    fireEvent.click(screen.getByRole('button', { name: 'Associate contact' }))
    await waitFor(() => expect(api.addCrmOpportunityContact).toHaveBeenCalledWith('opportunity-1', { contactId: 'contact-901', role: 'Scientific lead', isPrimary: false }))
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Role (optional)')).toHaveProperty('value', 'Scientific lead')
    expect(screen.getByRole('combobox', { name: 'Contact' })).toHaveProperty('value', 'Zeta Researcher')
  })

  it('requires confirmation before removing a saved association', async () => {
    const association = { id: 'association-1', contactId: 'contact-1', contactName: 'Ada Researcher', role: 'Scientific lead', isPrimary: true, isActive: true, version: 3 } as api.CrmOpportunityContact
    vi.mocked(api.listCrmOpportunityContacts).mockResolvedValue([association])
    vi.mocked(api.removeCrmOpportunityContact).mockRejectedValue(new Error('Removal unavailable'))
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Manage Ada Researcher association' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove association' }))
    expect(api.removeCrmOpportunityContact).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }))
    await waitFor(() => expect(api.removeCrmOpportunityContact).toHaveBeenCalledWith('opportunity-1', 'association-1', 3))
    await screen.findByText('Removal unavailable')
    expect(screen.getByRole('button', { name: 'Keep association' })).toHaveProperty('disabled', false)
  })
})
