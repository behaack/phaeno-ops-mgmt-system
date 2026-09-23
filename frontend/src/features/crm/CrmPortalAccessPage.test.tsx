import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CrmPortalAccessPage } from './CrmPortalAccessPage'

const api = vi.hoisted(() => ({ listRelationshipRequests: vi.fn(), listRelationshipRequestHistory: vi.fn(), listOrganizations: vi.fn(), applyRelationshipRequest: vi.fn(), getOrganizationSummary: vi.fn().mockResolvedValue({ isActive: true }), listDepartments: vi.fn().mockResolvedValue([]), listEntitlements: vi.fn().mockResolvedValue([]), getRequestCompletionReadiness: vi.fn().mockResolvedValue({ canComplete: true, blockers: [] }) }))
vi.mock('#/api/organization-management', async original => ({ ...await original<typeof import('#/api/organization-management')>(), ...api }))
vi.mock('#/api/crm', () => ({ listCrmHandoffs: vi.fn().mockResolvedValue([]) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, ...props }: ComponentProps<'a'>) => <a {...props} href="/company">{children}</a> }))
vi.mock('./CrmListNavigation', async original => {
  const actual = await original<typeof import('./CrmListNavigation')>()
  const { useState } = await import('react')
  return { ...actual, useCrmSearch: () => { const [value, setValue] = useState(''); return [value, setValue, value, setValue] }, useCrmState: (_key: string, initial: string) => useState(initial), CrmClearFilters: () => null, CrmProvisioningReturn: () => null }
})

describe('Company request fulfillment queue', () => {
  it('shows search and pagination only in completed history and requests the next server page', async () => {
    api.listRelationshipRequests.mockResolvedValue([])
    api.listOrganizations.mockResolvedValue([])
    api.listRelationshipRequestHistory.mockImplementation(async ({ page, search }) => ({
      items: [], page, pageSize: 25, totalCount: search ? 0 : 26,
    }))
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CrmPortalAccessPage /></QueryClientProvider>)
    expect(screen.queryByRole('textbox', { name: 'Search completed requests' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Completed / history' }), { key: 'Enter' })
    await screen.findByText('26 records · Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(api.listRelationshipRequestHistory).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 25 })))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search completed requests' }), { target: { value: 'missing' } })
    await screen.findByText('No completed requests match your search.')
    expect(api.listRelationshipRequests).toHaveBeenCalledWith({ activeOnly: true })
  })

  it('keeps an approved service request actionable until recorded completion succeeds', async () => {
    api.listRelationshipRequests.mockResolvedValue([{ id: 'request-1', requestNumber: 'REQ-1', companyId: 'company-1', organizationId: 'organization-1', candidateOrganizationName: 'Example Company', requestType: 'ServiceChange', source: 'FirstPartyCrm', status: 'Approved', requestedServices: ['PSeqLabService'], version: 7, summary: 'Approved service' }])
    api.listEntitlements.mockResolvedValueOnce([{ service: 'PSeqLabService', sourceRequestId: 'request-1', isUsable: true }])
    api.listOrganizations.mockResolvedValue([])
    api.applyRelationshipRequest.mockResolvedValue({ status: 'Applied' })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><CrmPortalAccessPage /></QueryClientProvider>)
    fireEvent.keyDown(await screen.findByRole('tab', { name: 'Approved / needs work (1)' }), { key: 'Enter' })
    await screen.findByText(/All checklist items are complete/)
    expect(screen.getByText('Actions → Complete request to record the completed work.').tagName).toBe('STRONG')
    expect(screen.queryByText(/Review the items marked Needs review/)).toBeNull()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for REQ-1' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Complete request' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete request' }))
    await waitFor(() => expect(api.applyRelationshipRequest).toHaveBeenCalledWith('request-1', { notes: '', organizationId: 'organization-1', version: 7 }))
  })
})
