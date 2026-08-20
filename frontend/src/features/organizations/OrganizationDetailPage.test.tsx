import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { DevelopmentInviteLinkDialog } from './OrganizationDetailPage'

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(() => {
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
})

it('copies a generated development sign-in link', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  render(
    <DevelopmentInviteLinkDialog
      invitationLink={{
        invitationId: '00000000-0000-0000-0000-000000000101',
        inviteUrl: 'https://localhost:3000/accept-invite?token=development-token',
        expiresAt: '2026-08-26T12:00:00Z',
      }}
      onOpenChange={vi.fn()}
    />,
  )

  expect(screen.getByRole('dialog', { name: 'Development sign-in link' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))

  await waitFor(() => {
    expect(writeText).toHaveBeenCalledWith(
      'https://localhost:3000/accept-invite?token=development-token',
    )
  })
  expect(screen.getByRole('status').textContent).toBe('Sign-in link copied.')
})
