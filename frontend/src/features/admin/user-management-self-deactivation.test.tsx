import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrganizationUserManagementPanel } from './OrganizationUserManagementPanel'
import { PhaenoUserManagementPanel } from './PhaenoUserManagementPanel'
import type {
  OrganizationUser,
  PhaenoUser,
} from '#/api/organization-management'

const mocks = vi.hoisted(() => ({
  createInvitation: vi.fn(),
  deactivateMembership: vi.fn(),
  listInvitations: vi.fn(),
  listOrganizationUsers: vi.fn(),
  listPhaenoUsers: vi.fn(),
  resendInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  setUserActive: vi.fn(),
  updateMembershipRole: vi.fn(),
  updatePhaenoUser: vi.fn(),
}))

vi.mock('#/api/organization-management', () => ({
  apiErrorMessage: () => 'The request failed.',
  ...mocks,
}))

describe('user-management self-deactivation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listInvitations.mockResolvedValue([])
  })

  it('reviews employee suspension, cancels without changes, then restores the same user', async () => {
    const employee = createPhaenoUser('employee', 'Simulated', 'Operator')
    employee.isPlatformAdministrator = false
    mocks.listPhaenoUsers.mockResolvedValue([employee])
    mocks.setUserActive.mockImplementation(async (_id, active) => {
      mocks.listPhaenoUsers.mockResolvedValue([{ ...employee, isActive: active, status: active ? 'Active' : 'Disabled' }])
    })
    renderPanel(<PhaenoUserManagementPanel canManageAccounts canManageLabRoles currentUserId="current-user" organizationId="phaeno-organization" />)
    await openActions('Simulated Operator')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Deactivate' }))
    let dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Simulated Operator/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(mocks.setUserActive).not.toHaveBeenCalled()
    await openActions('Simulated Operator')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Deactivate' }))
    dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate user' }))
    await screen.findByText('Disabled')
    expect(mocks.setUserActive).toHaveBeenCalledWith('employee', false)
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }))
    await screen.findByText('Active')
    await waitFor(() => expect(mocks.setUserActive).toHaveBeenLastCalledWith('employee', true))
    expect(mocks.setUserActive).toHaveBeenCalledTimes(2)
  })

  it('omits membership deactivation from the signed-in user’s actions', async () => {
    mocks.listOrganizationUsers.mockResolvedValue([
      createOrganizationUser('current-user', 'Bill', 'Haack'),
    ])

    renderPanel(
      <OrganizationUserManagementPanel
        currentUserId="current-user"
        organizationId="organization-1"
        organizationName="Johns Hopkins University"
      />,
    )

    expect(await screen.findByRole('button', { name: 'Edit' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Deactivate' })).toBeNull()
  })

  it('retains membership deactivation for another user', async () => {
    mocks.listOrganizationUsers.mockResolvedValue([
      createOrganizationUser('other-user', 'Another', 'User'),
    ])

    renderPanel(
      <OrganizationUserManagementPanel
        currentUserId="current-user"
        organizationId="organization-1"
        organizationName="Johns Hopkins University"
      />,
    )

    await openActions('Another User')

    expect(screen.getByRole('menuitem', { name: 'Deactivate' })).toBeTruthy()
  })

  it('omits account deactivation from the signed-in Phaeno user’s actions', async () => {
    mocks.listPhaenoUsers.mockResolvedValue([
      createPhaenoUser('current-user', 'Bill', 'Haack'),
    ])

    renderPanel(
      <PhaenoUserManagementPanel
        canManageAccounts
        canManageLabRoles
        currentUserId="current-user"
        organizationId="phaeno-organization"
      />,
    )

    expect(await screen.findByRole('button', { name: 'Edit' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Deactivate' })).toBeNull()
  })

  it('retains account deactivation for another Phaeno user', async () => {
    mocks.listPhaenoUsers.mockResolvedValue([
      createPhaenoUser('other-user', 'Another', 'User'),
    ])

    renderPanel(
      <PhaenoUserManagementPanel
        canManageAccounts
        canManageLabRoles
        currentUserId="current-user"
        organizationId="phaeno-organization"
      />,
    )

    await openActions('Another User')

    expect(screen.getByRole('menuitem', { name: 'Deactivate' })).toBeTruthy()
  })
})

function renderPanel(panel: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{panel}</QueryClientProvider>,
  )
}

async function openActions(name: string) {
  fireEvent.pointerDown(
    await screen.findByRole('button', { name: `Actions for ${name}` }),
    { button: 0, ctrlKey: false },
  )
}

function createOrganizationUser(
  id: string,
  firstName: string,
  lastName: string,
): OrganizationUser {
  return {
    id,
    email: `${firstName.toLowerCase()}@example.com`,
    firstName,
    lastName,
    isActive: true,
    status: 'Active',
    memberships: [
      {
        id: `${id}-membership`,
        organizationId: 'organization-1',
        organizationName: 'Johns Hopkins University',
        organizationKind: 'Customer',
        isActive: true,
        isOrganizationAdmin: true,
        createdAt: '2026-08-20T00:00:00Z',
        updatedAt: '2026-08-20T00:00:00Z',
        version: 1,
      },
    ],
    version: 1,
  }
}

function createPhaenoUser(
  id: string,
  firstName: string,
  lastName: string,
): PhaenoUser {
  return {
    id,
    email: `${firstName.toLowerCase()}@phaeno.com`,
    firstName,
    lastName,
    isActive: true,
    status: 'Active',
    isPlatformAdministrator: true,
    membershipId: `${id}-membership`,
    userVersion: 1,
    membershipVersion: 1,
    labRoles: [],
    businessRoles: [],
  }
}
