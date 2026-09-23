import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RelationshipRequest } from '#/api/organization-management'
import { CrmRequestCard } from './CrmRequestCard'

const api = vi.hoisted(() => ({ getOrganizationSummary: vi.fn(), getRequestCompletionReadiness: vi.fn(), reconcileOnlineAccessRequest: vi.fn() }))
vi.mock('#/api/organization-management', async original => ({ ...await original<typeof import('#/api/organization-management')>(), ...api }))
vi.mock('#/api/crm', () => ({ listCrmHandoffs: vi.fn().mockResolvedValue([]) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, ...props }: ComponentProps<'a'>) => <a {...props} href="/company">{children}</a> }))

const request: RelationshipRequest = { id: 'request-1', requestNumber: 'REQ-1', candidateOrganizationName: 'Example Company',
  companyId: 'company-1', organizationId: 'org-1', requestType: 'Onboarding', requestedOrganizationKind: 'Customer',
  status: 'Approved', requestedServices: [], version: 1, summary: 'Online access', source: 'FirstPartyCrm', sourceReference: null, internalNotes: null, requestedByUserId: 'staff-1', reviewedByUserId: 'staff-1', reviewedAt: '2026-09-19T12:00:00Z', decisionReason: 'Access approved', appliedByUserId: null, appliedAt: null, applicationNotes: null, createdAt: '2026-09-19T11:00:00Z', updatedAt: '2026-09-19T12:00:00Z' }

function setup(value = request) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 60000 } } })
  client.setQueryData(['relationship-requests', 'crm-access-review'], [value])
  const onAction = vi.fn()
  render(<QueryClientProvider client={client}><CrmRequestCard request={value} isPending={false} onAction={onAction} onRecover={vi.fn()} /></QueryClientProvider>)
  return { client, onAction }
}
function openActions() {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for REQ-1' }), { key: 'ArrowDown' })
}

describe('request live work and completion gate', () => {
  beforeEach(() => {
    api.getOrganizationSummary.mockReset().mockResolvedValue({ isActive: true, administratorStatus: 'Missing' })
    api.getRequestCompletionReadiness.mockReset().mockResolvedValue({ canComplete: false, blockers: ['An administrator must accept access.'], completesAutomatically: true })
    api.reconcileOnlineAccessRequest.mockReset().mockResolvedValue({ ...request, status: 'Applied', companyId: null, version: 2 })
  })
  it('shows waiting for acceptance and automatically reconciles ready access without a completion action', async () => {
    const { client, onAction } = setup()
    await screen.findByText(/Once Company access is enabled/)
    openActions()
    expect(screen.queryByRole('menuitem', { name: 'Complete request' })).toBeNull()
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    api.getOrganizationSummary.mockResolvedValue({ isActive: true, administratorStatus: 'Invited' })
    await act(async () => { await client.invalidateQueries() })
    expect(await screen.findByText('Waiting for acceptance')).toBeTruthy()
    expect(api.reconcileOnlineAccessRequest).not.toHaveBeenCalled()
    api.getOrganizationSummary.mockResolvedValue({ isActive: true, administratorStatus: 'Active' })
    api.getRequestCompletionReadiness.mockResolvedValue({ canComplete: true, blockers: [], completesAutomatically: true })
    await act(async () => { await client.invalidateQueries() })
    await waitFor(() => expect(api.reconcileOnlineAccessRequest).toHaveBeenCalledTimes(1))
    expect(api.reconcileOnlineAccessRequest).toHaveBeenCalledWith(request.id, request.version)
    expect(client.getQueryData<RelationshipRequest[]>(['relationship-requests', 'crm-access-review'])?.[0]).toMatchObject({ status: 'Applied', companyId: request.companyId })
    expect(onAction).not.toHaveBeenCalled()
    client.clear()
  })

  it('does not reconcile unknown progress and retries a failed automatic closeout', async () => {
    api.getOrganizationSummary.mockRejectedValue(new Error('Unavailable'))
    api.getRequestCompletionReadiness.mockResolvedValue({ canComplete: true, blockers: [], completesAutomatically: true })
    const { client } = setup()
    await screen.findByRole('alert')
    expect(api.reconcileOnlineAccessRequest).not.toHaveBeenCalled()
    api.getOrganizationSummary.mockResolvedValue({ isActive: true, administratorStatus: 'Active' })
    api.reconcileOnlineAccessRequest.mockRejectedValueOnce(new Error('Unavailable'))
    fireEvent.click(screen.getByRole('button', { name: 'Retry progress' }))
    await screen.findByText(/automatic completion could not be recorded/)
    fireEvent.click(screen.getByRole('button', { name: 'Retry completion' }))
    await waitFor(() => expect(api.reconcileOnlineAccessRequest).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    client.clear()
  })

  it('keeps manual work gated and fails closed after a refresh error', async () => {
    const manual = { ...request, requestType: 'ServiceChange' as const }
    api.getRequestCompletionReadiness.mockResolvedValue({ canComplete: false, blockers: ['Complete service setup.'], completesAutomatically: false })
    const { client, onAction } = setup(manual)
    await screen.findByText('Complete the remaining Work needed items above to finish this request.')
    expect(screen.queryByText('Complete service setup.')).toBeNull()
    openActions()
    const disabled = await screen.findByRole('menuitem', { name: 'Complete request' })
    expect(disabled.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(disabled)
    expect(onAction).not.toHaveBeenCalled()
    fireEvent.keyDown(disabled, { key: 'Escape' })
    api.getRequestCompletionReadiness.mockResolvedValue({ canComplete: true, blockers: [], completesAutomatically: false })
    await act(async () => { await client.invalidateQueries() })
    await screen.findByText(/Minimum requirements met. Finish the items marked Needs review/)
    expect(screen.getByText(/Review the items marked Needs review/)).toBeTruthy()
    openActions()
    const ready = await screen.findByRole('menuitem', { name: 'Complete request' })
    expect(ready.getAttribute('aria-disabled')).not.toBe('true')
    fireEvent.click(ready)
    expect(onAction).toHaveBeenCalledWith('apply', manual)
    api.getRequestCompletionReadiness.mockRejectedValue(new Error('Unavailable'))
    await act(async () => { await client.invalidateQueries() })
    await screen.findByRole('alert')
    openActions()
    const blocked = await screen.findByRole('menuitem', { name: 'Complete request' })
    expect(blocked.getAttribute('aria-disabled')).toBe('true')
    expect(api.reconcileOnlineAccessRequest).not.toHaveBeenCalled()
    client.clear()
  })
})
