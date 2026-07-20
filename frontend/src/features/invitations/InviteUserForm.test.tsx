import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { InviteUserForm } from './InviteUserForm'

const mocks = vi.hoisted(() => ({
  createInvitation: vi.fn(),
}))

vi.mock('#/api/invitations', () => ({
  createInvitation: mocks.createInvitation,
}))

describe('InviteUserForm', () => {
  it('creates an invitation for the selected organization', async () => {
    mocks.createInvitation.mockResolvedValue({
      id: 'invitation-1',
      organizationId: 'organization-1',
      organizationName: 'Acme Health',
      email: 'new.user@example.com',
      normalizedEmail: 'NEW.USER@EXAMPLE.COM',
      firstName: 'New',
      lastName: 'User',
      isOrganizationAdmin: true,
      labRoles: [],
      status: 'Pending',
      isExpired: false,
      expiresAt: '2026-06-08T00:00:00Z',
      acceptedAt: null,
      acceptedByUserId: null,
      revokedAt: null,
      revokedByUserId: null,
      declinedAt: null,
      declinedByUserId: null,
      lastSentAt: '2026-06-01T00:00:00Z',
      lastSentByUserId: 'user-1',
      sendCount: 1,
      lastEmailProviderMessageId: 'message-1',
      lastSendError: null,
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
      version: 1,
    })

    renderWithQueryClient(<InviteUserForm organizationId="organization-1" />)

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'New' },
    })
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'User' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'new.user@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/access role/i), {
      target: { value: 'Organization Admin' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => expect(mocks.createInvitation).toHaveBeenCalledTimes(1))
    expect(mocks.createInvitation.mock.calls[0]?.[0]).toEqual({
      organizationId: 'organization-1',
      firstName: 'New',
      lastName: 'User',
      email: 'new.user@example.com',
      isOrganizationAdmin: true,
      labRoles: [],
    })
    expect(await screen.findByText(/invite sent/i)).toBeTruthy()
  })
})

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  )
}
