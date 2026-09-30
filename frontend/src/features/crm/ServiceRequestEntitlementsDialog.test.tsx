import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RelationshipRequest, ServiceEntitlement } from '#/api/organization-management'
import { ServiceRequestEntitlementsDialog } from './ServiceRequestEntitlementsDialog'

const api = vi.hoisted(() => ({ listEntitlements: vi.fn(), listDepartments: vi.fn() }))
vi.mock('#/api/organization-management', async original => ({ ...await original<typeof import('#/api/organization-management')>(), ...api }))

const request = {
  id: 'request-1', requestNumber: 'PRQ-1', organizationId: 'organization-1',
  candidateOrganizationName: 'Example Company', requestedServices: ['PSeqLabService'],
  requestType: 'ServiceChange', status: 'PendingReview',
} as RelationshipRequest

function show(mode: 'approve' | 'setup' = 'approve') {
  const onSubmit = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ServiceRequestEntitlementsDialog request={request} mode={mode} isPending={false}
      onSubmit={onSubmit} onOpenChange={vi.fn()} />
  </QueryClientProvider>)
  return onSubmit
}

describe('service request permission editor', () => {
  it('captures the approved scope and saves a new Ready permission with the decision', async () => {
    api.listEntitlements.mockReset().mockResolvedValue([])
    api.listDepartments.mockReset().mockResolvedValue([{ id: 'department-1', name: 'Research', isActive: true }])
    const onSubmit = show()
    fireEvent.change(await screen.findByLabelText(/Applies to/), { target: { value: 'department-1' } })
    fireEvent.change(screen.getByLabelText(/Service configuration/), { target: { value: 'Ready' } })
    fireEvent.click(screen.getByRole('button', { name: 'Approve and save services' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      serviceEntitlements: [expect.objectContaining({
        service: 'PSeqLabService', departmentId: 'department-1',
        configurationStatus: 'Ready', existingEntitlementId: null,
      })],
    })))
  })

  it('loads and updates a matching permission for an already approved request', async () => {
    const existing = {
      id: 'entitlement-1', service: 'PSeqLabService', organizationId: 'organization-1',
      departmentId: null, sourceRequestId: null, effectiveFrom: '2026-09-01T00:00:00Z',
      effectiveTo: null, configurationStatus: 'Pending', endReason: null, version: 3,
    } as ServiceEntitlement
    api.listEntitlements.mockReset().mockResolvedValue([existing])
    api.listDepartments.mockReset().mockResolvedValue([])
    const onSubmit = show('setup')
    await screen.findByRole('option', { name: /Update existing/ })
    expect((screen.getByLabelText('Existing permission') as HTMLSelectElement).value).toBe(existing.id)
    fireEvent.change(screen.getByLabelText(/Service configuration/), { target: { value: 'Ready' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save services' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      serviceEntitlements: [expect.objectContaining({
        existingEntitlementId: existing.id, existingEntitlementVersion: 3,
        configurationStatus: 'Ready',
      })],
    })))
  })
})
