import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CrmPortalAccessPage } from './CrmPortalAccessPage'

const api = vi.hoisted(() => ({ listRelationshipRequests: vi.fn(), listOrganizations: vi.fn(), applyRelationshipRequest: vi.fn() }))
vi.mock('#/api/organization-management', async original => ({ ...await original<typeof import('#/api/organization-management')>(), ...api }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="/company">{children}</a> }))
vi.mock('./CrmListNavigation', async () => {
  const { useState } = await import('react')
  return { useCrmState: (_key: string, initial: string) => useState(initial), CrmClearFilters: () => null, CrmProvisioningReturn: () => null }
})

describe('Company request fulfillment queue', () => {
  it('keeps an approved service request actionable until recorded completion succeeds', async () => {
    api.listRelationshipRequests.mockResolvedValue([{ id: 'request-1', requestNumber: 'REQ-1', companyId: 'company-1', organizationId: 'organization-1', candidateOrganizationName: 'Example Company', requestType: 'ServiceChange', source: 'FirstPartyCrm', status: 'Approved', requestedServices: ['PSeqLabService'], version: 7, summary: 'Approved service' }])
    api.listOrganizations.mockResolvedValue([])
    api.applyRelationshipRequest.mockResolvedValue({ status: 'Applied' })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><CrmPortalAccessPage /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('tab', { name: 'Approved / needs work (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete request' }))
    fireEvent.change(screen.getByLabelText('Completed work', { exact: false }), { target: { value: 'Reviewed service authorization and completed setup.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete request' }))
    await waitFor(() => expect(api.applyRelationshipRequest).toHaveBeenCalledWith('request-1', { notes: 'Reviewed service authorization and completed setup.', organizationId: 'organization-1', version: 7 }))
  })
})
