import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebsiteOperationsWorkspace } from './WebsiteOperationsWorkspace'
import type { PhaenoSessionContextValue } from '#/features/auth/session-context'

const state = vi.hoisted(() => ({ value: {} as PhaenoSessionContextValue, mailingList: vi.fn(), demos: vi.fn() }))
vi.mock('#/features/auth/session-context', async original => ({
  ...await original<typeof import('#/features/auth/session-context')>(), usePhaenoSession: () => state.value,
}))
vi.mock('#/api/web-ops', async original => ({
  ...await original<typeof import('#/api/web-ops')>(), getWebOpsMailingList: state.mailingList, getWebOpsDemoRequests: state.demos,
}))

beforeEach(() => vi.clearAllMocks())
describe('Website operations direct-route boundary', () => {
  it.each(['Customer', 'Partner', 'Prospect', 'Phaeno'] as const)('does not read queues for an unauthorized %s context', kind => {
    state.value = {
      isLoading: false, selectedOrganizationId: 'org',
      session: { state: 'ready', isPlatformAdmin: kind !== 'Phaeno', memberships: [{ organizationId: 'org', organizationKind: kind }] },
    } as PhaenoSessionContextValue
    render(<WebsiteOperationsWorkspace />)
    expect(screen.getByText(/requires a Phaeno platform administrator/)).toBeTruthy()
    expect(state.mailingList).not.toHaveBeenCalled()
    expect(state.demos).not.toHaveBeenCalled()
    expect(screen.queryByRole('navigation', { name: 'Website operations sections' })).toBeNull()
  })
  it('keeps loading distinct from denied access without reading the queues', () => {
    state.value = { isLoading: true } as PhaenoSessionContextValue
    render(<WebsiteOperationsWorkspace />)
    expect(screen.getByRole('status').textContent).toContain('Loading Website operations')
    expect(state.mailingList).not.toHaveBeenCalled()
    expect(state.demos).not.toHaveBeenCalled()
  })
})
